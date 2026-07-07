## 왜 지금 이 개념들인가

화성형 팔란티어 Phase 1은 단일 HTML + Vercel 서버리스로 동작한다. 빠른 검증을 위한 의도적 선택이었다. Phase 2·3에서 React + Node.js + PostgreSQL + PostGIS로 넘어가면 **"어떻게 배포하고 운영하느냐"** 가 핵심 문제가 된다.

이 글은 컨테이너·Docker·MSA·Kubernetes 네 개념을 도식 이미지로 정리한다.

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

PostGIS 같은 공간 DB는 버전 차이에 특히 민감하다. 로컬에서 잘 뜨던 ST_Contains()가 서버에서 오류를 내는 상황이 실제로 발생했다. 컨테이너는 이 문제를 근본적으로 해결한다.

---

## 2. 가상머신 vs 컨테이너

두 방식은 같은 문제를 다르게 푼다. **"앱 실행 환경을 어떻게 격리할 것인가"**.

**가상머신 (VM) 구조**

![VM Architecture](https://media.datacamp.com/cms/google/ad_4nxesczb5dk044owszd8w8whor_cc8szfyx2gpynmk1bykoirjlrbhxbz4diox3wwkkfzznhurpl9ywzzavnmtzuuz6digavyx9buogky7gq5j5xdceirkyywpsyowd1xm9tsbylaamdgcepstmu8yoettjy.png)

VM은 Guest OS 전체를 가상화한다. 완벽한 격리가 되지만 각 VM이 수 GB를 차지하고 부팅에 수십 초가 걸린다.

**컨테이너 구조**

![Container Architecture](https://media.datacamp.com/cms/google/ad_4nxccxw4oomp2u39k4whg-7uuk2wfqygbngtqpwgaib37xwsxwx_gulc1htagiqvumikcemna0vx5dvfdy-jyot0yfpho-t3mhhvvcxukaor_kbibyu9ec65gardbokfujmuin22ai53roidim6m04oowxaax.png)

컨테이너는 호스트 OS의 커널을 공유하고 앱과 의존성만 묶는다. 수십 MB 크기에 초 단위로 시작한다.

| 항목 | VM | 컨테이너 |
|------|-----|---------|
| 격리 수준 | 강함 (OS 완전 분리) | 프로세스 수준 격리 |
| 크기 | 수 GB | 수십~수백 MB |
| 부팅 시간 | 수십 초 | 수 초 이내 |
| 적합한 상황 | 강한 보안 격리 필요 | 빠른 배포·확장 필요 |

---

## 3. Docker: 컨테이너를 만들고 실행하는 도구

Docker는 클라이언트-서버 구조로 동작한다.

![Docker Architecture](https://docs.docker.com/get-started/docker-overview/images/docker-architecture.webp)

- **Docker Client**: `docker build`, `docker run` 같은 명령을 받아 Daemon에 전달
- **Docker Daemon**: 이미지 빌드, 컨테이너 실행, 레지스트리 통신을 처리
- **Docker Registry**: 이미지를 저장하는 저장소 (Docker Hub, GitHub Container Registry 등)

**이미지가 만들어지는 과정**

![Docker Host](https://media.geeksforgeeks.org/wp-content/uploads/20251218122638607429/docker_host.webp)

Dockerfile의 각 명령(`FROM`, `RUN`, `COPY`)이 레이어가 된다. 레이어는 캐시되므로 소스 코드만 바뀌면 `npm install`을 다시 실행하지 않는다.

**화성형 팔란티어 Node.js 서버 Dockerfile 예시**

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production   # 이 레이어는 package.json이 바뀔 때만 재실행

COPY . .                       # 소스 변경 시 여기서부터 재실행
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 4. MSA: 왜 컨테이너를 여러 개로 나누는가

**모놀리식(Monolithic) 아키텍처**

![Monolithic Architecture](https://media.geeksforgeeks.org/wp-content/uploads/20260120121708468357/devops_9.webp)

모든 기능이 하나의 코드베이스·하나의 배포 단위에 묶인다. 단순하지만 한 기능에 버그가 나면 전체가 멈추고, 특정 기능만 스케일아웃할 수 없다.

**마이크로서비스(MSA) 아키텍처**

![Microservices Architecture](https://media.geeksforgeeks.org/wp-content/uploads/20260120121708674412/devops_10.webp)

기능별로 독립된 서비스로 분리한다. 각 서비스는 독립 배포되고 독립 스케일아웃된다.

**모놀리식 vs MSA 비교**

![Monolith vs Microservices Comparison](https://d1.awsstatic.com/Developer%20Marketing/containers/monolith_1-monolith-microservices.70b547e30e30b013051d58a93a6e35e77408a2a8.png)

| 상황 | 모놀리식 | MSA |
|------|---------|-----|
| 특정 기능 버그 | 전체 서비스 다운 | 해당 서비스만 영향 |
| 트래픽 급증 | 전체 스케일아웃 | 해당 서비스만 인스턴스 추가 |
| 새 기능 배포 | 전체 재시작 | 해당 서비스만 롤링 업데이트 |
| 언어/프레임워크 | 통일 강제 | Python, Node.js 혼합 가능 |
| 장애 추적 | 쉬움 (로그 한 곳) | 어려움 (분산 트레이싱 필요) |
| 팀 규모 | 소규모에 적합 | 서비스별 팀이 생기는 규모 |

> **화성형 팔란티어 현실**: Phase 3까지는 팀이 작으므로 완전한 MSA보다 **모듈식 모놀리스** + 컨테이너 분리가 현실적이다.

---

## 5. Kubernetes: 컨테이너 오케스트레이터

컨테이너가 10개, 20개가 되면 수동 관리가 불가능해진다. K8s는 이를 자동화한다.

![Kubernetes Architecture](https://media.geeksforgeeks.org/wp-content/uploads/20260406154006746759/k8s-arch.webp)

**Control Plane** — 클러스터 전체를 제어한다:
- **API Server**: kubectl 명령의 진입점. 모든 통신의 허브
- **etcd**: 클러스터 상태를 저장하는 분산 KV 스토어
- **Scheduler**: 새 Pod를 어느 노드에 배치할지 결정
- **Controller Manager**: "원하는 상태"와 "실제 상태"의 차이를 감지·교정

**Worker Node** — 실제 컨테이너가 동작하는 서버:
- **kubelet**: 노드에서 Pod 실행을 담당
- **kube-proxy**: 네트워크 규칙 관리
- **Pod**: 컨테이너 1개(또는 묶음)의 최소 배포 단위

**K8s가 해결하는 문제**

| 문제 | K8s 없을 때 | K8s 있을 때 |
|------|-----------|-----------|
| 컨테이너 죽음 | 수동 재시작 | 자동 재시작 (Self-healing) |
| 트래픽 급증 | 수동 추가 | 자동 스케일아웃 (HPA) |
| 새 버전 배포 | 서비스 중단 | 무중단 롤링 업데이트 |
| 서비스 간 주소 | IP 직접 관리 | DNS 자동 부여 (Service) |

**화성형 팔란티어 Deployment 예시**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: search-service
spec:
  replicas: 2                    # 항상 2개 Pod 유지
  selector:
    matchLabels:
      app: search
  template:
    spec:
      containers:
      - name: search
        image: hscitycity/search-api:v1.2.0
        ports:
        - containerPort: 3000
        env:
        - name: NAVER_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: naver-client-id
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          periodSeconds: 10
```

---

## 6. 화성형 팔란티어 배포 로드맵

```
Phase 1 (현재)          Phase 2 (예정)           Phase 3 (목표)
──────────────────      ─────────────────────    ────────────────────────
Vercel 서버리스          Docker Compose           Kubernetes (NHN Cloud)
  search.js        →    api 컨테이너         →    search-service Pod
  extract.js       →    api 컨테이너         →    extract-service Pod
  agent.js         →    api 컨테이너         →    agent-service Pod
  index.html       →    frontend 컨테이너    →    frontend Pod
  (DB 없음)        →    postgis 컨테이너     →    PostgreSQL StatefulSet
                                            →    scheduler CronJob (ETL)
```

**CI/CD 파이프라인 (목표)**

```
git push
  → GitHub Actions: 테스트 → docker build → docker push
  → kubectl apply → 롤링 업데이트
  → https://palantir.hwaseong.go.kr 반영
```

---

## 정리

| 개념 | 한 줄 요약 |
|------|----------|
| 컨테이너 | 앱과 의존성을 하나로 봉인. "내 컴에선 됩니다" 해결 |
| Docker | 컨테이너를 빌드·실행·배포하는 표준 도구 |
| MSA | 기능별로 서비스를 분리해 독립 배포·확장 가능하게 |
| Kubernetes | 수십~수백 개 컨테이너를 자동으로 관리하는 오케스트레이터 |

Phase 1에서는 속도를 위해 이 모두를 건너뛰었다. Phase 2에서 Docker Compose로 개발 환경을 통일하고, Phase 3에서 K8s로 운영 환경을 이전하는 것이 현재 계획이다.
