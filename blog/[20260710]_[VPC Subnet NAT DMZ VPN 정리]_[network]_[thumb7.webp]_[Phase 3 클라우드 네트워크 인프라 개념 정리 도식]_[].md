## 왜 지금 이 개념들인가

Phase 1의 화성형 팔란티어는 Vercel 서버리스로 동작한다. `search.js`, `extract.js`, `agent.js` 모두 함수 하나 배포하면 끝이었고, 네트워크 계층은 Vercel이 통째로 추상화해줬다. IP도, 방화벽도, 라우팅 테이블도 신경 쓸 일이 없었다.

Phase 3에서 Naver Cloud로 옮기고 PostgreSQL/PostGIS를 직접 운영하기 시작하면 얘기가 완전히 달라진다. 공간 DB에 화성시 도시 데이터가 쌓이는데, 그 DB를 인터넷에 그대로 열어둘 수는 없다. 그렇다고 아무도 못 들어가면 관리자가 접속해서 점검도 못 한다. 이 모순을 푸는 표준 답이 VPC, Subnet, NAT Gateway, 중계서버, DMZ, VPN이다.

이 글은 이 여섯 개념을 그림으로 정리한다.

---

## 1. VPC: 클라우드 안의 내 전용 네트워크

VPC(Virtual Private Cloud)는 클라우드 제공자의 물리 인프라 위에 논리적으로 분리해 만든 나만의 네트워크다. 다른 고객의 VPC와는 완전히 격리되고, IP 대역(CIDR)도 내가 정한다.

![VPC Architecture](https://media.geeksforgeeks.org/wp-content/uploads/20260518162525673075/external_network.webp)

**VPC 내부 구성요소**

![VPC Core Components](https://media.geeksforgeeks.org/wp-content/uploads/20260520160700016718/inside_the_vpc_core_components_.webp)

- **CIDR 블록**: VPC 전체가 쓸 IP 범위. 예: `10.0.0.0/16` (65,536개 주소)
- **서브넷(Subnet)**: CIDR을 잘게 나눈 하위 네트워크
- **라우팅 테이블**: 트래픽을 어디로 보낼지 정하는 규칙
- **인터넷 게이트웨이(IGW)**: VPC와 인터넷을 연결하는 관문

---

## 2. Subnet: Public vs Private

VPC 하나를 통째로 쓰지 않고 서브넷으로 나누는 이유는 "이 자원은 외부에 노출되어도 되는가"를 네트워크 단위로 나눠서 관리하기 위해서다.

| 구분 | Public Subnet | Private Subnet |
|------|---------------|-----------------|
| 인터넷 게이트웨이 라우트 | 있음 (`0.0.0.0/0 → igw`) | 없음 |
| 인바운드(외부→내부) | 가능 | 불가능 |
| 아웃바운드(내부→외부) | 직접 가능 | NAT Gateway 경유 |
| 배치 대상 | 로드밸런서, Bastion, NAT GW | 애플리케이션 서버, DB |

```
CIDR 예시
10.0.0.0/16              VPC 전체
├── 10.0.1.0/24          Public Subnet  (AZ-a)
├── 10.0.2.0/24          Public Subnet  (AZ-c)
├── 10.0.11.0/24         Private Subnet (AZ-a)  ← PostGIS
└── 10.0.12.0/24         Private Subnet (AZ-c)  ← PostGIS 복제본
```

핵심은 **DB와 애플리케이션 서버는 Public IP를 아예 갖지 않는다**는 것. 인터넷에서 직접 도달할 방법 자체가 없다.

---

## 3. NAT Gateway: Private Subnet도 인터넷은 써야 한다

Private Subnet의 서버가 외부 접속을 받지는 않지만, `npm install`이나 OS 보안 업데이트처럼 나가는(outbound) 인터넷 접근은 필요하다. 이걸 가능하게 하면서 인바운드는 여전히 막아주는 장치가 NAT Gateway다.

![VPC with Public/Private Subnets and NAT Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/images/vpc-example-private-subnets.png)

동작 방식:
1. Private Subnet의 서버가 외부로 요청을 보낸다
2. 라우팅 테이블이 그 트래픽을 NAT Gateway(Public Subnet에 위치)로 보낸다
3. NAT Gateway가 자신의 공인 IP로 바꿔서 인터넷에 요청한다
4. 응답이 오면 원래 보낸 서버에게만 돌려준다 — **외부가 먼저 연결을 시작하는 건 불가능**

| 항목 | Internet Gateway | NAT Gateway |
|------|-------------------|--------------|
| 방향 | 양방향 (인바운드 허용) | 아웃바운드 전용 |
| 배치 위치 | VPC 경계 | Public Subnet |
| 용도 | 웹서버, LB처럼 외부 노출 자원 | DB, 앱서버 등 내부 자원의 외부 접근 |

---

## 4. 중계서버 (Bastion Host / Jump Server)

NAT Gateway가 "나가는 트래픽"을 위한 장치라면, Bastion Host는 "관리자가 들어오는 트래픽"을 위한 단일 관문이다.

![Bastion Host and NAT Gateway Placement](https://media.geeksforgeeks.org/wp-content/uploads/20260520160700295701/user.webp)

```
개발자 노트북
   │ SSH (22번 포트, 특정 IP만 허용)
   ▼
Bastion Host  (Public Subnet, Public IP 보유)
   │ SSH (Bastion 보안그룹에서만 허용)
   ▼
PostGIS 서버 / K8s 워커 노드  (Private Subnet, Public IP 없음)
```

- Private Subnet의 서버들은 SSH를 Bastion의 보안그룹 ID에서 오는 트래픽에만 연다 — `0.0.0.0/0`은 절대 열지 않는다
- 모든 관리자 접속이 Bastion 한 곳을 거치므로 접속 로그도 한 곳에서 감사(audit)할 수 있다
- Bastion 자체가 뚫리면 전체가 위험해지므로, 이 인스턴스 하나만큼은 패치·모니터링을 가장 엄격하게 관리해야 한다

---

## 5. DMZ: 외부에 노출해야 하는 서버를 격리하는 구역

DMZ(비무장지대)는 "외부에 보여줘야 하는 서비스"와 "완전히 숨겨야 하는 내부망" 사이에 두는 완충 구역이다. Public Subnet이 AWS/클라우드 용어라면, DMZ는 더 오래된 네트워크 보안 개념이고 개념적으로 거의 같은 역할을 한다.

![DMZ Network Architecture](https://media.geeksforgeeks.org/wp-content/uploads/20220808192523/DemiltarizedZoneDMZ.png)

```
인터넷 ── [외부 방화벽] ── DMZ (웹서버, 프록시) ── [내부 방화벽] ── 내부망 (DB, 관리 시스템)
```

- 외부 방화벽: 인터넷 → DMZ, 필요한 포트(80/443)만 허용
- 내부 방화벽: DMZ → 내부망, DMZ의 서버가 뚫려도 내부망까지 못 넘어가도록 훨씬 엄격하게 제한
- 화성형 팔란티어에 대입하면: **API 게이트웨이/프론트엔드 = DMZ**, **PostGIS/내부 관리 도구 = 내부망**

---

## 6. VPN: 안전한 터널

VPN은 신뢰할 수 없는 네트워크(인터넷) 위에 암호화된 터널을 뚫어서, 마치 같은 사설망에 있는 것처럼 통신하게 해준다. 용도에 따라 두 종류로 나뉜다.

**Site-to-Site VPN** — 네트워크와 네트워크를 통째로 연결

![Site-to-Site VPN](https://media.geeksforgeeks.org/wp-content/uploads/20190519193120/Untitled-Diagram-191.png)

**Remote Access VPN** — 개인 사용자가 원격에서 사설망에 접속

![Remote Access VPN](https://media.geeksforgeeks.org/wp-content/uploads/20190519193144/Untitled-Diagram-201.png)

| 구분 | Site-to-Site VPN | Remote Access VPN |
|------|-------------------|---------------------|
| 연결 단위 | 네트워크 ↔ 네트워크 | 개인 단말 ↔ 네트워크 |
| 예시 | 화성시청 내부망 ↔ Naver Cloud VPC | 담당자가 재택에서 VPC 접속 |
| 특징 | 상시 연결, 라우터 대 라우터 | 필요할 때만 클라이언트로 접속 |

화성형 팔란티어가 화성시청 내부 시스템(예: 기존 행정 DB)과 데이터를 주고받아야 한다면 Site-to-Site VPN이, 담당 공무원이 원격으로 서버를 점검해야 한다면 Remote Access VPN이 필요해진다.

---

## 7. 화성형 팔란티어 Phase 3 네트워크 설계(안)

```
                              인터넷
                                │
                         [Internet Gateway]
                                │
        ┌───────────────────────┴───────────────────────┐
        │                    VPC (10.0.0.0/16)            │
        │  ┌─────────────── Public Subnet ─────────────┐ │
        │  │  Load Balancer   NAT Gateway   Bastion     │ │
        │  └──────────────────────┬──────────────────────┘ │
        │                         │                          │
        │  ┌─────────────── Private Subnet ─────────────┐ │
        │  │  K8s Worker Node (search/extract/agent Pod) │ │
        │  │  PostgreSQL/PostGIS StatefulSet             │ │
        │  └──────────────────────────────────────────────┘ │
        └───────────────────────┬───────────────────────────┘
                                 │ Site-to-Site VPN
                          화성시청 내부망
```

- 외부 사용자 요청 → Load Balancer(Public Subnet) → K8s Pod(Private Subnet)
- Pod의 `npm install`, OS 업데이트 등 아웃바운드 → NAT Gateway
- 담당자 서버 점검 SSH → Bastion → Private Subnet
- 화성시청 내부 행정 데이터 연동 → Site-to-Site VPN

---

## 정리

| 개념 | 한 줄 요약 |
|------|-----------|
| VPC | 클라우드 안에 격리된 내 전용 네트워크 |
| Public/Private Subnet | "외부 노출 허용 여부"로 나눈 네트워크 구역 |
| NAT Gateway | Private Subnet의 아웃바운드 인터넷 접근을 대신 처리 |
| 중계서버(Bastion) | 관리자 접속을 한 곳으로 모아 감사·통제하는 관문 |
| DMZ | 외부 노출 서비스와 내부망 사이의 완충 구역 |
| VPN | 인터넷 위에 뚫는 암호화 터널 (네트워크 간 / 개인 접속) |

Phase 1에서는 이 여섯 개념 전부가 필요 없었다. Vercel이 다 가려줬기 때문이다. Phase 3에서 Naver Cloud로 옮기는 순간부터는 이 그림을 직접 설계해야 하고, 그 설계가 곧 화성형 팔란티어의 보안 수준을 결정한다.
