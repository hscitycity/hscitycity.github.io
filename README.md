# 개발일지 (GitHub Pages 블로그 뼈대)

Jekyll + GitHub Pages로 바로 띄울 수 있는 개발 기록용 블로그입니다. 코드/산출물이 쌓이면서, 무엇을 시도했고 무엇이 됐고 안 됐는지를 남기는 용도로 만들어졌습니다.

## 1. 처음 한 번만 — GitHub Pages로 띄우기

1. GitHub에서 새 저장소를 만듭니다.
   - 저장소 이름을 **`사용자이름.github.io`** 로 하면 주소가 바로 `https://사용자이름.github.io` 가 됩니다. (가장 간단)
   - 다른 이름(예: `dev-log`)으로 만들면 주소는 `https://사용자이름.github.io/dev-log` 가 되고, 이 경우 `_config.yml`의 `baseurl` 값을 `"/dev-log"`로 바꿔줘야 합니다.
2. 이 폴더 안의 파일을 전부 그 저장소에 push 합니다.
   ```bash
   cd 이폴더
   git init
   git add .
   git commit -m "init: 개발일지 블로그 시작"
   git branch -M main
   git remote add origin https://github.com/사용자이름/저장소이름.git
   git push -u origin main
   ```
3. GitHub 저장소 → **Settings → Pages** 로 들어가서 Source를 `Deploy from a branch` → `main` / `(root)`로 설정합니다.
4. 1~2분 기다리면 `_config.yml`에서 설정한 주소로 사이트가 뜹니다. (별도 빌드 설정 없이 GitHub가 Jekyll을 자동으로 빌드합니다.)
5. `_config.yml`의 `title`, `url`, `social_links`의 github user 등을 본인 정보로 바꿔주세요.

## 2. 글 쓰는 법

`_posts/` 폴더에 `YYYY-MM-DD-제목.md` 형식으로 파일을 만듭니다. `_drafts/template.md`를 복사해서 시작하면 편합니다.

```bash
cp _drafts/template.md _posts/2026-07-01-새로운-기록.md
```

파일 맨 위 front matter(`---`로 둘러싸인 부분)에 제목/날짜/태그를 채우고, 본문에 **배경 → 시도 → 결과 → 교훈** 순서로 적습니다. 다 쓰면 commit & push 하면 바로 사이트에 반영됩니다.

## 3. 평소엔 더 가볍게 — `notes/CHANGELOG.md`

매번 정식 글을 쓰기 부담스러운 거친 메모는 `notes/CHANGELOG.md`에 날짜별로 짧게 적습니다. 이건 사이트에 따로 표시되지 않는 작업 로그용 파일입니다. 어느 정도 쌓이면 그중 정리할 만한 걸 골라서 `_posts/`에 다듬어진 글로 옮기는 식으로 운영하면 됩니다.

## 4. 로컬에서 미리보기 (선택)

```bash
bundle install
bundle exec jekyll serve
```
`http://localhost:4000` 에서 push 하기 전에 미리 확인할 수 있습니다. (Ruby/Bundler가 설치되어 있어야 합니다. 꼭 필요한 단계는 아니고, GitHub에 push만 해도 자동으로 빌드됩니다.)

## 폴더 구조

```
_config.yml        사이트 설정 (제목, 주소 등)
Gemfile             GitHub Pages와 동일한 빌드 환경 고정
index.md            홈 화면 (글 목록)
about.md            소개 페이지
_posts/             정리된 글 (날짜-제목.md)
_drafts/template.md 새 글 쓸 때 복사해서 쓰는 템플릿
notes/CHANGELOG.md  평소 거친 작업 메모
```
