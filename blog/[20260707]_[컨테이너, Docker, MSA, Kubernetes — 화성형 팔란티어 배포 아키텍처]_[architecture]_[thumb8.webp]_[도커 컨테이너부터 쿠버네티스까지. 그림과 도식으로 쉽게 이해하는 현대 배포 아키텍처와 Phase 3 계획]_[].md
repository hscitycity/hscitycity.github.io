## 왜 지금 이 개념들인가

화성형 팔란티어 Phase 1은 단일 HTML + Vercel 서버리스로 동작한다. 빠른 검증을 위한 의도적 선택이었다. Phase 2·3에서 React + Node.js + PostgreSQL + PostGIS로 넘어가면 **"어떻게 배포하고 운영하느냐"** 가 핵심 문제가 된다.

이 글은 컨테이너·Docker·MSA·Kubernetes 네 개념을 도식으로 정리한다.

---

## 1. 문제: "내 컴에선 됩니다"

개발 환경과 운영 환경이 다를 때 생기는 일:

```
개발 노트북                    운영 서버
──────────────────────         ──────────────────────
Node.js  18.12.1              Node.js  16.20.0   ← 버전 다름
PostgreSQL 15.3               PostgreSQL 13.1    ← 버전 다름
GDAL     3.7.0                GDAL     2.4.0     ← PostGIS 의존성 다름
.env 파일 존재                 .env 파일 없음     ← 환경변수 누락
```

PostGIS 같은 공간 DB는 버전 차이에 특히 민감하다. 로컬에서 잘 뜨던 ST_Contains()가 서버에서 오류를 내는 상황이 실제로 발생했다.

---

## 2. 가상머신 vs 컨테이너

전통적 해결책은 가상머신(VM)이다. 컨테이너는 더 가벼운 대안이다.

**가상머신 (VM)**

```
┌──────────────────────────────────────────────────┐
│                  물리 서버 (하드웨어)              │
├──────────────────────────────────────────────────┤
│               호스트 OS (Ubuntu)                 │
├──────────────────────────────────────────────────┤
│            하이퍼바이저 (VMware, VirtualBox)       │
├───────────────────────┬──────────────────────────┤
│    Guest OS (Ubuntu)  │   Guest OS (CentOS)      │
│    라이브러리 A        │   라이브러리 B             │
│    앱 A (Node.js)     │   앱 B (Python)           │
└───────────────────────┴──────────────────────────┘

각 VM = Guest OS 전체 포함 → 수 GB
부팅 시간 = 수십 초~수 분
```

**컨테이너 (Docker)**

```
┌──────────────────────────────────────────────────┐
│                  물리 서버 (하드웨어)              │
├──────────────────────────────────────────────────┤
│               호스트 OS (Ubuntu)                 │
├──────────────────────────────────────────────────┤
│            컨테이너 런타임 (Docker Engine)         │
├───────────────────────┬──────────────────────────┤
│  컨테이너 A            │  컨테이너 B               │
│  (앱 A + 의존성만)     │  (앱 B + 의존성만)        │
└───────────────────────┴──────────────────────────┘

OS 커널은 호스트와 공유 → 수십 MB
시작 시간 = 수 초 이내
```

| 항목 | VM | 컨테이너 |
|------|-----|---------|
| 격리 수준 | 강함 (OS 완전 분리) | 프로세스 수준 격리 |
| 크기 | 수 GB | 수십 MB~수백 MB |
| 부팅 시간 | 수십 초 | 수 초 이내 |
| 이식성 | 이미지 크고 무거움 | 경량 이미지 레지스트리 |
| 적합한 상황 | 보안 강도가 높아야 할 때 | 빠른 배포·확장이 필요할 때 |

---

## 3. Docker: 컨테이너를 만들고 실행하는 도구

Docker의 세 가지 핵심 오브젝트:

```
Dockerfile          이미지 (Image)        컨테이너 (Container)
──────────          ──────────────        ────────────────────
"레시피"      →     "완성된 패키지"   →    "실행 중인 인스턴스"

집 설계도           완성된 아파트          실제 입주한 아파트
```

**Dockerfile → 이미지 → 컨테이너 흐름**

```
Dockerfile
    │
    │  docker build
    ▼
이미지 (Image)
    │                    ┌──── Docker Hub (공개)
    │  docker push  ─────┤
    │                    └──── NHN Cloud CR (사설)
    │
    │  docker run
    ▼
컨테이너 (Container) ← 프로세스처럼 동작
```

**화성형 팔란티어 Node.js 서버 Dockerfile 예시**

```dockerfile
# 1단계: 베이스 이미지 선택 (alpine = 경량 Linux)
FROM node:18-alpine

# 2단계: 작업 디렉토리 설정
WORKDIR /app

# 3단계: 의존성만 먼저 복사 (레이어 캐시 활용)
COPY package*.json ./
RUN npm ci --only=production

# 4단계: 소스 코드 복사
COPY . .

# 5단계: 포트 선언 및 실행 명령
EXPOSE 3000
CMD ["node", "server.js"]
```

**레이어 캐시의 의미**

```
소스 코드만 변경된 경우:

Layer 1: FROM node:18-alpine        ✅ 캐시 사용
Layer 2: WORKDIR /app               ✅ 캐시 사용
Layer 3: COPY package*.json         ✅ 캐시 사용 (package.json 안 바뀜)
Layer 4: RUN npm ci                 ✅ 캐시 사용 (npm install 재실행 안 함!)
Layer 5: COPY . .                   🔄 재실행 (소스가 바뀌었으니)
Layer 6: CMD ["node", "server.js"]  🔄 재실행

→ npm install 을 매번 다시 안 해도 된다. 빌드 시간 대폭 단축.
```

---

## 4. Docker Compose: 로컬 개발 환경 통일

서비스가 여러 개면 docker-compose.yml 한 파일로 전체를 띄운다.

```yaml
# docker-compose.yml (Phase 2 개발 환경)
version: '3.9'
services:

  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/hwaseong
    depends_on:
      - db

  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: hwaseong
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"

volumes:
  pgdata:
```

```
docker compose up   한 번으로
  ├── api 컨테이너 시작 (Node.js)
  ├── db 컨테이너 시작 (PostGIS)
  └── frontend 컨테이너 시작 (React)
```

팀원 누구든 `git clone` + `docker compose up` 이면 동일한 개발 환경이 된다.

---

## 5. MSA: 왜 컨테이너를 여러 개 나누는가

**모놀리식 (Monolithic)**

```
┌──────────────────────────────────────────────────────┐
│                   단일 애플리케이션                    │
│                                                      │
│   ┌─────────────┐   ┌──────────────┐                │
│   │  검색 API    │   │  AI 에이전트  │                │
│   └─────────────┘   └──────────────┘                │
│   ┌────────────────────┐   ┌──────────────────────┐  │
│   │  공간 데이터 처리   │   │  ETL / 데이터 수집    │  │
│   └────────────────────┘   └──────────────────────┘  │
│   ┌─────────────┐                                    │
│   │  사용자 인증  │                                    │
│   └─────────────┘                                    │
└──────────────────────────────────────────────────────┘
            ↓
   문제점:
   - AI 기능에 버그 → 검색도 죽음
   - AI 기능만 스케일아웃 불가
   - 배포 시 전체 서비스 재시작
   - 언어/프레임워크를 통일해야 함 (Python 못 섞음)
```

**MSA (Microservices Architecture)**

```
                        클라이언트 (React)
                              │
                      API Gateway / 로드밸런서
                    ┌─────────┼──────────┐
                    │         │          │
          ┌─────────┴──┐  ┌───┴────┐  ┌──┴────────────┐
          │ 검색 서비스  │  │AI 에이전│  │ 공간 데이터    │
          │ (Node.js)  │  │트 서비스│  │ 서비스         │
          │            │  │(Python)│  │ (PostGIS)     │
          └─────────┬──┘  └───┬────┘  └──┬────────────┘
                    │         │          │
          ┌─────────┴──────────┴──────────┴───────────┐
          │              메시지 버스 / DB               │
          └────────────────────────────────────────────┘
```

| 상황 | 모놀리식 | MSA |
|------|---------|-----|
| AI 기능 버그 | 전체 서비스 다운 | AI 서비스만 영향 |
| 트래픽 급증 | 전체 스케일아웃 | AI 서비스만 인스턴스 추가 |
| 새 기능 배포 | 전체 재시작 | 해당 서비스만 롤링 업데이트 |
| 언어/프레임워크 | 통일 강제 | Python, Node.js 혼합 가능 |
| 장애 추적 | 쉬움 (한 로그) | 어려움 (분산 트레이싱 필요) |
| 팀 규모 | 소규모에 적합 | 서비스별 팀이 생기는 규모 |

> **화성형 팔란티어 현실**: Phase 3까지는 팀이 작으므로 완전한 MSA보다 **모듈식 모놀리스**가 현실적이다. 단, 컨테이너로 묶어 향후 분리를 열어둔다.

---

## 6. Kubernetes (K8s): 컨테이너 오케스트레이터

컨테이너가 10개, 20개가 되면 수동 관리가 불가능하다. Kubernetes는 이를 자동화한다.

**K8s가 해결하는 문제**

```
문제 1: 컨테이너가 죽으면?
  Docker만   → 수동으로 재시작해야 함
  K8s        → 자동 재시작 (Self-healing)

문제 2: 트래픽이 갑자기 몰리면?
  Docker만   → 수동으로 컨테이너 추가
  K8s        → CPU/메모리 기준 자동 스케일아웃 (HPA)

문제 3: 새 버전 배포 중 다운타임?
  Docker만   → 잠깐 서비스 중단
  K8s        → 롤링 업데이트 (무중단 배포)

문제 4: 서비스 간 통신 주소?
  Docker만   → IP 직접 관리
  K8s        → Service 오브젝트로 DNS 자동 부여
```

**K8s 클러스터 구조**

```
┌─────────────────────────────────────────────────────────┐
│                   Kubernetes 클러스터                    │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  Control Plane                    │  │
│  │                                                   │  │
│  │  ┌────────────┐  ┌───────────┐  ┌─────────────┐  │  │
│  │  │ API Server │  │ Scheduler │  │  Controller │  │  │
│  │  │ (kubectl   │  │ (어디에   │  │  Manager    │  │  │
│  │  │  통신 허브) │  │  배포?)   │  │  (상태 감시) │  │  │
│  │  └────────────┘  └───────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Worker    │  │   Worker    │  │   Worker    │    │
│  │   Node 1    │  │   Node 2    │  │   Node 3    │    │
│  │             │  │             │  │             │    │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │   │
│  │ │  Pod    │ │  │ │  Pod    │ │  │ │  Pod    │ │   │
│  │ │(검색)   │ │  │ │ (AI)    │ │  │ │(PostGIS)│ │   │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │   │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**K8s 핵심 오브젝트**

| 오브젝트 | 역할 | 비유 |
|---------|------|------|
| Pod | 컨테이너 1개(또는 묶음)의 실행 단위 | 직원 한 명 |
| Deployment | "Pod를 N개 유지해라" 선언 | 채용 공고 (항상 N명 유지) |
| Service | Pod들에 접근하는 고정 DNS/IP | 대표 전화번호 |
| Ingress | 외부 HTTP 트래픽을 서비스로 라우팅 | 안내 데스크 |
| ConfigMap | 환경변수, 설정값 관리 | 회사 공용 설정 문서 |
| Secret | 비밀키, DB 비밀번호 관리 | 금고 |
| PVC | 컨테이너 재시작해도 데이터 유지 | 외장 HDD |

**화성형 팔란티어 Deployment 예시**

```yaml
# search-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: search-service
  namespace: hwaseong
spec:
  replicas: 2                    # 항상 2개 Pod 유지
  selector:
    matchLabels:
      app: search
  template:
    metadata:
      labels:
        app: search
    spec:
      containers:
      - name: search
        image: hscitycity/search-api:v1.2.0
        ports:
        - containerPort: 3000
        env:
        - name: NAVER_CLIENT_ID
          valueFrom:
            secretKeyRef:         # Secret에서 API 키 주입
              name: api-keys
              key: naver-client-id
        resources:
          requests:
            memory: "128Mi"
            cpu: "250m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:            # 컨테이너 살아있는지 주기적 확인
          httpGet:
            path: /health
            port: 3000
          periodSeconds: 10
```

**롤링 업데이트 흐름 (무중단 배포)**

```
v1.1.0 배포 상태:
  Pod-1 (v1.1.0) ✅
  Pod-2 (v1.1.0) ✅

v1.2.0 배포 시작:
  Pod-1 (v1.1.0) ✅   ← 트래픽 처리 중
  Pod-2 (v1.1.0) ✅
  Pod-3 (v1.2.0) 🔄  ← 새 Pod 추가 중

Pod-3 Ready 확인 후:
  Pod-1 (v1.1.0) 🗑️  ← 하나씩 종료
  Pod-2 (v1.1.0) ✅
  Pod-3 (v1.2.0) ✅

완료:
  Pod-3 (v1.2.0) ✅
  Pod-4 (v1.2.0) ✅

→ 서비스 중단 없이 버전 업그레이드 완료
```

---

## 7. 화성형 팔란티어 배포 로드맵

```
Phase 1 (현재)          Phase 2 (진행 예정)      Phase 3 (목표)
──────────────────      ────────────────────      ──────────────────────────
Vercel 서버리스          Docker Compose           Kubernetes on NHN Cloud
                         (로컬 개발 환경)
  search.js         →   api 컨테이너         →   search-service Deployment
  extract.js        →   api 컨테이너         →   extract-service Deployment
  agent.js          →   api 컨테이너         →   agent-service Deployment
  index.html        →   frontend 컨테이너    →   frontend Deployment
  (DB 없음)         →   postgis 컨테이너     →   PostgreSQL StatefulSet
                                             →   scheduler CronJob (ETL)
```

**CI/CD 파이프라인 (목표)**

```
개발자 git push
    │
    ▼
GitHub Actions
    │
    ├── 1. 테스트 실행
    ├── 2. docker build
    ├── 3. docker push → NHN Cloud Container Registry
    │
    ▼
kubectl apply → K8s 클러스터
    │
    ▼
롤링 업데이트 자동 실행
    │
    ▼
https://palantir.hwaseong.go.kr 반영
```

---

## 정리

```
문제                    도구           해결
─────────────────       ────────       ──────────────────────────────
환경 차이 ("내 컴에선")  컨테이너       이미지에 환경 봉인, 어디서나 동일
컨테이너 빌드/실행      Docker         표준 도구, Dockerfile로 재현 가능
복잡한 멀티 컨테이너     Docker         docker-compose.yml 한 파일로 통합
                        Compose
서비스 독립 배포/확장    MSA            기능별 분리, 장애 격리
컨테이너 자동 관리      Kubernetes     자동복구, 스케일아웃, 무중단 배포
```

화성형 팔란티어 Phase 1은 속도를 위해 이 모두를 건너뛰었다. Phase 2에서 Docker Compose로 개발 환경을 통일하고, Phase 3에서 K8s로 운영 환경을 이전하는 것이 현재 계획이다.
