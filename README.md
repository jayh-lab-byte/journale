# Journale

여행 사진을 올리면 촬영 시각과 위치로 Day, Moment를 묶고 Story, Timeline, Map으로 다시 보게 하는 스토리북입니다.

UI 언어는 영어입니다. 샘플 스토리북 세 권은 데모이며, 사용자 여행과 저장소를 따로 둡니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

`DATABASE_URL`이 없으면 개발 서버는 메타데이터를 `data/store.json`에, 사진 파일은 `data/blobs/`에 저장합니다. 이 파일 저장은 로컬 개발용입니다. Vercel에서는 `DATABASE_URL`이 있어야 합니다.

## 환경변수

`.env.example`을 복사해 `.env`를 만듭니다.

```text
DATABASE_URL=
OPENAI_API_KEY=
BLOB_READ_WRITE_TOKEN=
VITE_MAP_STYLE_URL=
```

- `DATABASE_URL`: Neon Postgres 연결 문자열. 있으면 메타데이터는 Neon에 저장됩니다.
- `OPENAI_API_KEY`: 대표 사진 설명과 스토리 문장에 사용합니다. 없으면 확인된 시각, 장소, 사용자 메모만으로 짧은 글을 만듭니다.
- `BLOB_READ_WRITE_TOKEN`: 있으면 브라우저가 Vercel Blob으로 직접 업로드할 수 있습니다. 로컬에서는 API로 파일을 저장합니다.
- `VITE_MAP_STYLE_URL`: MapLibre 스타일. 비어 있으면 OpenFreeMap Liberty 스타일을 사용합니다.

시크릿은 클라이언트 번들에 넣지 않습니다. `VITE_` 접두사는 지도 스타일 URL에만 사용합니다.

## 아키텍처

```text
React + Vite
  → Vercel Serverless Functions (/api)
    → Neon Postgres  메타데이터
    → OpenAI         사진 설명과 스토리
    → Vercel Blob    사진 파일
```

브라우저는 최초 방문 때 `localStorage`의 `journey_owner_key`를 만듭니다. 서버에는 그 값의 SHA-256만 저장합니다. 사이트 데이터를 지우면 같은 브라우저에서 수정 권한을 되돌리기 어렵습니다. 다른 기기와 자동으로 동기화되지 않습니다.

## 데이터베이스

```bash
npm run db:migrate
```

`db/migrations/001_init.sql`을 `DATABASE_URL`에 적용합니다.

## Vercel

프로젝트를 Vercel에 연결하고 환경변수를 넣은 뒤 배포합니다. `npm run build` 결과를 정적 파일로 제공하고, `api/[[...path]].js`가 API를 처리합니다.

Neon을 연결한 뒤 마이그레이션을 실행합니다. 사진 저장을 쓰려면 Blob 토큰을 설정합니다.

## 지도

MapLibre와 OpenStreetMap 계열 타일을 사용합니다. 선은 사진 위치를 시간순으로 이은 것이며, 실제 이동 경로가 아닙니다.

## 이미지

사용자 업로드는 JPG, JPEG, PNG를 권장합니다. HEIC는 브라우저가 읽을 수 있을 때만 시도하고, 실패한 사진만 건너뜁니다.

샘플 이미지는 Unsplash 사진입니다. 각 샘플 화면에 출처를 표시합니다.

## 알려진 제한

- 로그인, 검색, 음성, 공동 편집, 인쇄 주문은 없습니다.
- 공유 링크의 원문 토큰은 만든 직후에만 보여 줍니다. 서버에는 해시만 남습니다. 링크를 다시 만들면 이전 링크는 꺼집니다.
- 로컬 파일 저장은 Vercel의 일시 디스크에서 유지되지 않습니다.
- 사진 주소는 추측하기 어려운 아이디를 사용합니다. 주소가 새어 나가면 그 사진은 볼 수 있습니다.
- OpenAI 키가 없으면 모델 문장 대신 메타데이터 초안을 사용합니다.
