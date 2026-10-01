# JOURNALE — AI Travel Memory Storybook
## Codex 프로젝트 개발명세서

> 문서 목적  
> 이 문서는 Google Stitch에서 제작한 화면 시안을 바탕으로 Codex가 실제 반응형 웹 MVP를 구현하기 위한 **최종 개발 기준**이다.  
> Stitch 이미지는 **시각적 레퍼런스**일 뿐이며, 화면에 보이는 모든 문구·숫자·기능을 실제 요구사항으로 해석하면 안 된다.  
> 이 문서의 요구사항이 Stitch 시안보다 우선한다.

---

# 0. Codex 작업 원칙

## 반드시 지킬 것

1. **이 문서를 최우선 개발 기준으로 사용한다.**
2. Stitch 이미지에서는 다음만 참고한다.
   - 전체 비주얼 톤
   - 레이아웃
   - 타이포그래피 위계
   - 카드/버튼/탭 형태
   - 모바일/데스크톱 반응형 구성
   - Story / Timeline / Map 간 UX 관계
3. Stitch 이미지에 보이더라도 이 문서에 없는 기능은 임의로 구현하지 않는다.
4. 먼저 **핵심 사용자 흐름이 처음부터 끝까지 동작하는 최소 수직 슬라이스**를 완성한다.
5. 불필요한 추상화, 디자인 시스템 과설계, 과도한 패키지 추가를 피한다.
6. 모든 상태를 명시적으로 처리한다.
   - loading
   - empty
   - error
   - partial success
   - save success
   - save failure
7. 사용자 입력값은 오류가 발생해도 잃지 않도록 한다.
8. 민감한 비밀값은 절대 클라이언트 번들에 넣지 않는다.
9. 실제 구현되지 않은 기능을 UI 문구로 약속하지 않는다.
10. 완료되지 않은 기능을 완료된 것처럼 README나 UI에 표시하지 않는다.

---

# 1. 절대 참고하지 말아야 할 Stitch 요소

Stitch 시안에는 시각적 완성도를 위해 실제 제품 범위를 넘어서는 문구와 기능이 포함되어 있다.

아래 항목은 **무시하거나 제거해야 한다.**

## 1.1 가짜 성능·보안·정밀도 수치

다음과 같은 문구/숫자는 구현하지 않는다.

- `18.4s / 500 RAWs`
- `GPS ±4.2m Precision`
- `Satellites: 9`
- `Coordinate drift tolerance ≤ 18 meters`
- `AES-256 GCM`
- `Certified Colophon`
- `Spatial Engine EXIF-GEO V2.4`
- 실제 측정 근거가 없는 퍼센트 진행률
- 실제 계산 근거가 없는 ETA

대신 실제 데이터로 계산 가능한 값만 표시한다.

예:

- `428 photos indexed`
- `9 locations detected`
- `14 moments created`
- `Stage 3 of 5`

---

## 1.2 오프라인 처리 과장

다음 표현은 사용하지 않는다.

- `Private & Offline Processing`
- `Zero Cloud Upload`
- 전체 AI 처리와 저장이 로컬에서만 이루어진다는 표현

실제 구조는 다음과 같다.

- EXIF 1차 파싱: 브라우저 로컬
- 사진 저장: 클라우드 오브젝트 스토리지
- DB: NeonDB
- AI 처리: 서버 측 OpenAI API

사용 가능한 문구 예:

- `Preview locally before upload`
- `Photo metadata is read on your device before reconstruction begins.`
- `Private by default — your journey is not shared unless you choose to share it.`

---

## 1.3 MVP에서 제외하는 기능

아래 기능은 구현하지 않는다.

- 로그인
- 회원가입
- 계정 프로필
- 공동 작업
- 공동 사진 업로드
- 친구 초대
- 댓글
- 여러 사람 기억 병합
- 사용자 간 협업
- 검색
- 음성 메모
- 오디오 녹음
- Ambient Audio
- AI 생성 배경음
- PDF Export
- 실제 인쇄 주문
- Trip Replay
- 여행 일정 추천
- 항공/숙박 예약
- 장소 추천
- 여행 커뮤니티
- SNS Feed
- 공개 검색
- Travel Memory semantic search
- Planned vs Lived
- 실물 Photo Book 주문

---

## 1.4 Memory Interview에서 기억을 유도하는 표현

사용자의 실제 기억을 오염시킬 수 있는 구체적인 제안은 금지한다.

예를 들어 AI가 확인하지 못한 상태에서 다음을 먼저 제시하지 않는다.

- `Bill Evans LP playing`
- `Stray courtyard cat`
- `The barista said...`
- `You drank a flat white`
- `It was raining`

대신 기억의 방향만 제공한다.

예:

- `What did you hear?`
- `What did you eat or drink?`
- `Who were you with?`
- `Was anything unexpected?`

사진/EXIF에서 관찰 가능한 정보만 근거로 질문한다.

---

## 1.5 지도 관련 주의

Stitch의 지도 이미지는 레이아웃 참고용이다.

- Google Maps UI를 픽셀 단위로 복제하지 않는다.
- Google Maps 브랜드 요소를 재현하지 않는다.
- 실제 구현은 **MapLibre + OpenStreetMap 계열 타일**을 우선 사용한다.

---

# 2. 프로젝트 목표

여행 후 사진을 한 번에 업로드하면:

1. 사진의 날짜/시간/위치 메타정보를 분석하고
2. 사진을 Day와 Moment로 자동 그룹핑하고
3. 방문 흐름을 Timeline과 Map으로 복원하고
4. AI가 사진만으로 알 수 없는 기억을 짧게 질문하고
5. 사용자 답변을 바탕으로 개인적인 Story를 생성해
6. Story / Timeline / Map으로 다시 볼 수 있는 여행 Storybook을 완성한다.

핵심 제품 문장:

> Turn your camera roll into the story you remember.

---

# 3. 핵심 제품 원칙

## 3.1 Zero-input first

사용자가 처음부터 다음을 직접 입력하게 하지 않는다.

- 여행 제목
- 여행 날짜
- 장소
- 일정
- Day
- Moment

가능한 정보는 사진에서 자동 추출한다.

---

## 3.2 AI는 사실을 창작하지 않는다

Story 생성 시 다음 데이터 계층을 지킨다.

### Fact
- EXIF 날짜/시간
- GPS
- 사용자가 직접 수정/입력한 정보

### Vision Interpretation
- 사진에서 관찰 가능한 시각 정보
- landmark
- indoor/outdoor
- food
- landscape
- people count 수준의 관찰

### User Memory
- Memory Interview 답변

### Unknown
- 확인할 수 없는 사실

AI는 Unknown을 사실처럼 생성하지 않는다.

---

## 3.3 같은 데이터, 세 가지 View

하나의 Journey를 세 가지 방식으로 보여준다.

- Story
- Timeline
- Map

세 화면은 동일한 Journey / Day / Moment 데이터를 사용해야 한다.

---

# 4. 구현 트랙

## Track B — 실서비스 지향 MVP

기술 스택:

- React
- Vite
- JavaScript
- React Router
- CSS
- Vercel
- Vercel Serverless Functions
- Neon Serverless Postgres
- Vercel Blob
- OpenAI API
- MapLibre
- OpenStreetMap 계열 타일
- GitHub

---

# 5. 아키텍처

```text
React + Vite Client
        ↓
Vercel
        ↓
Vercel Serverless Functions
        ↓
 ┌───────────────┬────────────────┐
 │               │                │
NeonDB       OpenAI API      Vercel Blob
metadata     AI processing   photo storage
```

사진 업로드:

```text
Browser
  ↓
Vercel Blob
```

메타데이터:

```text
Browser
  ↓
API
  ↓
NeonDB
```

AI:

```text
Browser
  ↓
Serverless Function
  ↓
OpenAI API
```

클라이언트에서 OpenAI API Key, DATABASE_URL, Blob token 등을 직접 사용하지 않는다.

---

# 6. 로그인 없는 소유권 모델

MVP에서는 로그인/회원가입을 구현하지 않는다.

브라우저 최초 실행 시 랜덤 소유자 키를 생성한다.

예:

```text
localStorage
journey_owner_key
```

서버에는 원문 owner key를 저장하지 않고 hash를 저장한다.

예:

```text
owner_key_hash
```

주의:

- 브라우저 저장소가 삭제되면 편집 권한 복구가 어려울 수 있다.
- 이 제한은 README에 명시한다.
- 다른 브라우저/기기 간 자동 동기화는 MVP 범위가 아니다.

---

# 7. 읽기 전용 공유

친구와의 공유는 지원한다.

단, 공동 작업은 지원하지 않는다.

## Share 동작

Journey 제작자가:

`Share Journey`

를 누르면 읽기 전용 링크를 생성한다.

예:

```text
/share/:token
```

공유 페이지에서 가능한 것:

- Story 보기
- Timeline 보기
- Map 보기

공유 페이지에서 불가능한 것:

- 편집
- 삭제
- 사진 업로드
- AI 재생성
- Memory 입력
- 위치 수정

공유 링크는 비밀 랜덤 토큰 기반으로 생성한다.

DB에는 토큰 원문 대신 hash 저장을 우선한다.

---

# 8. 핵심 데이터 구조

```text
Journey
 ├ Day
 │   └ Moment
 │       ├ Photos
 │       ├ Place
 │       ├ Memories
 │       └ Story
 │
 └ Share
```

---

# 9. MVP 핵심 기능

## P0

- Journey Library
- Sample Storybooks
- Create Journey
- 다중 사진 업로드
- EXIF 날짜/시간 추출
- EXIF GPS 추출
- Day 자동 생성
- Moment 자동 그룹핑
- 장소 데이터 생성
- 대표 사진 선택
- AI Vision 분석
- Story View
- Timeline View
- Map View
- Memory Interview
- Story 생성
- Story 수정
- 장소 확인/수정
- Journey 저장
- 새로고침 후 유지
- Journey 삭제
- 반응형 웹

## P1 — 이번 구현에서 포함

- 읽기 전용 Share Link
- Share Link 비활성화

---

# 10. 지원 이미지 형식

초기 MVP 권장:

- JPG
- JPEG
- PNG

HEIC는 가능하면 지원하되 필수 완료 조건으로 두지 않는다.

HEIC 지원이 불안정할 경우:

- 업로드 전 사용자에게 지원 범위 안내
- 실패 사진만 건너뛰기
- 전체 Journey가 실패하지 않도록 처리

---

# 11. 사진 처리 전략

모든 사진을 바로 Vision API에 보내지 않는다.

처리 순서:

```text
Photo Selection
↓
Local EXIF parsing
↓
Date grouping
↓
GPS grouping
↓
Time + location moment clustering
↓
Representative photo selection
↓
Vision AI
↓
Story generation
```

목적:

- AI 비용 감소
- 속도 개선
- 중복 분석 감소
- 오류 범위 축소

---

# 12. Day 생성 규칙

기본:

- EXIF DateTimeOriginal의 날짜 기준
- 사용자의 현지 여행 날짜가 유지되도록 timezone 처리 주의

사진 촬영 날짜가 다르면 별도 Day로 분리한다.

Day 구조 예:

```text
Day 01 · Apr 12
Day 02 · Apr 13
Day 03 · Apr 14
```

---

# 13. Moment 생성 규칙

Moment는 시간 + 위치 기준의 사진 그룹이다.

초기 규칙은 단순하게 구현한다.

예:

- 같은 Day
- 촬영시간 차이가 일정 범위 이하
- GPS가 존재한다면 일정 거리 이하

정확한 임계값은 상수로 분리한다.

예:

```js
MOMENT_TIME_GAP_MINUTES
MOMENT_DISTANCE_METERS
```

향후 조정 가능하게 한다.

---

# 14. Location Confidence

모든 장소는 confidence를 가진다.

값:

```text
confirmed
estimated
unknown
```

### confirmed
GPS/EXIF 기반으로 충분히 확인 가능

### estimated
주변 사진 시간/위치 정보로 추정

### unknown
위치 판단 불가

UI에서는 색상만으로 구분하지 않는다.

텍스트 라벨을 반드시 제공한다.

---

# 15. Reconstructed Route

Map의 Route는 실제 연속 GPS Track이 아니다.

반드시 다음 의미를 유지한다.

> Reconstructed from photo locations.

사진 Moment 좌표를 시간순으로 연결한다.

실제 이동 도로/교통수단을 사실처럼 생성하지 않는다.

---

# 16. Memory Interview

한 번에 한 질문만 표시한다.

기본 구조:

```text
Related Moment
↓
Question
↓
Short Answer
↓
Save / Skip
```

질문 개수:

- Journey당 3~5개 우선
- 최대 10개를 넘기지 않는다.

질문 대상 예:

- 사진이 많은 Moment
- 긴 체류 시간
- 큰 Timeline gap
- 장소가 불확실한 Moment
- Story를 풍부하게 만들기 좋은 Moment

---

# 17. Memory Interview 질문 원칙

좋은 예:

- `You took many photos here. What made this place memorable?`
- `There is a long gap in the afternoon. Do you remember what happened?`
- `What do you remember most about this stop?`

피해야 할 예:

- `Was Bill Evans playing here?`
- `Did the barista recommend an LP?`
- `You seemed happy here. Why?`

AI가 사용자의 감정이나 사건을 추정해서 질문하면 안 된다.

---

# 18. Story 생성

Story 입력:

- Day
- Moment 시간
- 장소
- EXIF
- 대표사진 Vision 결과
- 사용자 Memory

Story 생성 규칙:

- 확인되지 않은 사건 생성 금지
- 사용자의 감정 추측 금지
- 장소 역사 정보 자동 추가 금지
- 관광 안내문 스타일 금지
- 사용자 Memory 우선
- 짧고 자연스러운 여행 에세이 톤
- 과도한 감성 문구 금지

---

# 19. Sample Storybooks

첫 방문 사용자에게 결과물을 미리 보여준다.

고정 Sample:

- Germany Spring 2026
- Tokyo Nights 2025
- Jeju Weekend 2026

Sample은 실제 사용자 데이터와 분리한다.

반드시 표시:

```text
Sample
```

또는

```text
Demo
```

Sample Storybook은:

- Story
- Timeline
- Map

모두 열람 가능해야 한다.

Sample Storybook은 편집할 수 없다.

---

# 20. Unsplash 사용

Unsplash는 Sample Storybook용 이미지에만 사용한다.

금지:

- 앱 내부 Unsplash 검색 UI
- stock image browser
- 사용자 Journey에 Unsplash 사진 자동 삽입

Sample 이미지 데이터에 다음 메타데이터를 유지한다.

- photographer name
- image URL
- attribution URL
- source

UI에서 subtle credit 표시.

---

# 21. 주요 화면

## 21.1 Library

구성:

```text
Hero
Create Journey CTA

My Journeys

Sample Storybooks
```

로그인이 없으므로 Account 메뉴는 제거한다.

Desktop Navigation:

```text
Library
Create Journey
Sample Storybooks
```

Mobile:

```text
Library
Create
```

---

## 21.2 Create Journey

기능:

- 다중 사진 선택
- drag & drop
- thumbnail preview
- 선택 수 표시
- 선택 제거
- Reconstruct Journey

처음부터 요구하지 않는 것:

- 여행 제목
- 여행 날짜
- 도시
- 일정

---

## 21.3 Reconstruction

가짜 퍼센트 대신 stage 기반 진행상태.

예:

```text
✓ Reading photo dates
✓ Finding places
● Grouping moments
○ Building your timeline
○ Preparing your story
```

실제 계산 가능한 count만 표시.

예:

```text
86 photos indexed
6 locations detected
12 moments created
```

---

## 21.4 Story

우선순위:

1. Day
2. Story Title
3. Hero Photo
4. Story
5. Supporting Photos
6. Memory
7. Next Day

사진과 글이 중심.

Dashboard처럼 보이지 않게 한다.

---

## 21.5 Timeline

기본 Moment:

```text
time
place
photo count
thumbnail
confidence
```

선택된 Moment만 확장.

Expanded:

- representative photos
- short memory
- confidence
- Story 이동 버튼
- location confirm

---

## 21.6 Map

Desktop:

```text
Moment list | Large Map
```

Mobile:

```text
Large Map
↓
Selected Moment bottom sheet
```

Day 필터 지원.

지도에 실제 경로처럼 보이는 과도한 정밀도 금지.

---

## 21.7 Memory Interview

Mobile:

```text
Photo
Question
Answer
```

Desktop:

```text
Related Moment / Photo | Question + Answer
```

Chat UI로 만들지 않는다.

---

## 21.8 Share

Journey 메뉴:

```text
Share Journey
```

Share modal:

```text
Share this Journey

Anyone with this link can view
the Story, Timeline and Map.

[ Copy Link ]

Sharing: On

[ Stop Sharing ]
```

---

# 22. 반응형 기준

반드시 다음 폭을 고려한다.

- 320px
- 390px
- tablet
- 1280px
- 1440px+

모바일 디자인을 단순 확대해서 Desktop을 만들지 않는다.

---

# 23. Desktop responsive rules

## Library
- 2~3 column grid
- My Journeys 우선
- Sample Storybooks secondary

## Story
- readable center column
- optional side context
- 본문 max-width 제한

## Timeline
- timeline + selected detail split 가능

## Map
- 넓은 map
- side moment panel

## Memory Interview
- photo left
- question right

## Upload
- 넓은 drop zone
- multi-column preview grid

---

# 24. Mobile responsive rules

- single column
- horizontal overflow 금지
- 최소 44px touch target
- sticky Story / Timeline / Map 가능
- Map bottom sheet
- Timeline vertical
- Photo-first Story

---

# 25. 접근성

반드시:

- semantic HTML
- heading hierarchy
- label 연결
- button은 button 요소 사용
- visible focus
- keyboard usable
- aria-live for processing status
- 색상 외 텍스트 상태 표시
- prefers-reduced-motion
- Map 정보 Timeline에서도 확인 가능

---

# 26. 보안

절대 클라이언트에 포함하지 않는다.

```text
DATABASE_URL
OPENAI_API_KEY
BLOB_READ_WRITE_TOKEN
```

SQL은 parameter binding.

API 입력 서버 검증.

로그에 남기지 않는 것:

- secret
- raw token
- 전체 사진 metadata dump
- 전체 user memory
- API key

---

# 27. 개인정보

기본:

- Journey private
- 공유 전까지 public 접근 금지
- 공유는 random secret token
- Share off 가능
- Journey 삭제 가능
- 사진 삭제 가능

UI에서 과장된 암호화 문구를 사용하지 않는다.

---

# 28. NeonDB 초안

## journeys

```sql
id uuid primary key
owner_key_hash text not null
title text
started_at timestamptz
ended_at timestamptz
cover_photo_id uuid
status text not null
created_at timestamptz
updated_at timestamptz
```

## days

```sql
id uuid primary key
journey_id uuid not null
day_number integer not null
date date
title text
created_at timestamptz
updated_at timestamptz
```

## moments

```sql
id uuid primary key
journey_id uuid not null
day_id uuid not null
title text
started_at timestamptz
ended_at timestamptz
latitude double precision
longitude double precision
location_confidence text
story text
created_at timestamptz
updated_at timestamptz
```

## photos

```sql
id uuid primary key
journey_id uuid not null
moment_id uuid
blob_url text not null
filename text
taken_at timestamptz
latitude double precision
longitude double precision
width integer
height integer
vision_description text
is_representative boolean default false
is_cover boolean default false
created_at timestamptz
```

## places

```sql
id uuid primary key
journey_id uuid not null
name text
latitude double precision
longitude double precision
confidence text
created_at timestamptz
updated_at timestamptz
```

## memories

```sql
id uuid primary key
moment_id uuid not null
question text not null
answer text
created_at timestamptz
updated_at timestamptz
```

## journey_shares

```sql
id uuid primary key
journey_id uuid not null
share_token_hash text not null unique
is_active boolean default true
created_at timestamptz
updated_at timestamptz
```

필요한 FK와 index를 migration으로 선언한다.

---

# 29. API 초안

```text
GET    /api/journeys
POST   /api/journeys

GET    /api/journeys/:id
PATCH  /api/journeys/:id
DELETE /api/journeys/:id

POST   /api/journeys/:id/photos
POST   /api/journeys/:id/reconstruct

GET    /api/journeys/:id/days
GET    /api/journeys/:id/moments

PATCH  /api/moments/:id
POST   /api/moments/:id/memory
POST   /api/moments/:id/story
PATCH  /api/moments/:id/story

POST   /api/journeys/:id/share
DELETE /api/journeys/:id/share

GET    /api/shared/:token
```

API 응답 형태는 일관되게 유지한다.

오류:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input.",
    "fields": {}
  }
}
```

---

# 30. 업로드 정책

사진을 Vercel Function body로 직접 전달하지 않는다.

권장:

```text
Browser
↓
Vercel Blob direct/client upload
```

업로드 완료 후 metadata만 API로 전달.

업로드 실패 시:

- 성공한 사진 유지
- 실패한 사진 표시
- 재시도 제공
- 전체 Journey 초기화 금지

---

# 31. AI 실패 처리

Vision 실패:

- 해당 사진만 AI 분석 unavailable
- Journey는 계속 생성

Story 생성 실패:

- Memory/사진 유지
- Retry 가능

일부 장소 추정 실패:

- unknown으로 저장
- 사용자가 수정 가능

---

# 32. 상태 설계

모든 주요 화면에 상태를 구현한다.

## Library
- loading
- empty
- loaded
- error

## Upload
- empty
- selected
- uploading
- partial failure
- complete

## Reconstruction
- processing
- partial success
- failed
- completed

## Journey
- loading
- ready
- story failed
- no GPS
- no memories

## Share
- disabled
- creating
- active
- copy success
- revoke success
- error

---

# 33. 디자인 구현 주의

Stitch 이미지는 최대한 참고하되:

- exact pixel-perfect보다 실제 UX를 우선
- 실현 불가능한 장식 기능 구현 금지
- 가짜 기술 스펙 구현 금지
- 가짜 데이터 정확도 표시 금지
- Google Maps UI 복제 금지
- bilingual duplicate text 금지

Visual direction:

- editorial
- premium
- calm
- photo-first
- neutral warm palette
- serif headline
- readable sans-serif metadata
- restrained cards
- minimal shadows

---

# 34. 텍스트 언어

MVP 기본 UI 언어는 영어로 구현한다.

단:

- 문자열은 하드코딩을 최소화
- 향후 i18n 가능하도록 text constants 분리 권장

Sample Story에 한국어/영어가 동시에 중복 렌더링되지 않게 한다.

---

# 35. Seed / Demo Data

개발 시 실제 기능 확인을 위해 별도 seed를 둔다.

Sample Storybooks는 실제 사용자 Journey와 DB/상태를 분리한다.

개발용 sample 데이터는 명확히:

```text
sample
demo
placeholder
```

로 구분한다.

---

# 36. README 필수 내용

README에 포함:

- 프로젝트 개요
- 실행 방법
- 환경변수
- 아키텍처
- DB migration 방법
- Vercel 배포 방법
- Neon 연결 방법
- Vercel Blob 설정
- OpenAI API 설정
- Map 설정
- 로그인 없는 owner key 방식의 한계
- 지원 이미지 형식
- known limitations
- sample data 출처

---

# 37. .env.example

예:

```text
DATABASE_URL=
OPENAI_API_KEY=
BLOB_READ_WRITE_TOKEN=
VITE_MAP_STYLE_URL=
```

실제 secret은 커밋하지 않는다.

---

# 38. QA.md 작성

QA.md를 만들고 실제 수행한 검증만 기록한다.

최소 확인:

- 320px
- 390px
- desktop 1280+
- 사진 업로드
- EXIF 추출
- GPS 있음/없음
- Day grouping
- Moment grouping
- Story 생성
- Story 실패/재시도
- Timeline
- Map
- Memory 저장
- 새로고침
- Journey 삭제
- Share link 생성
- Share read-only 접근
- Share revoke
- console error
- network failure
- secret 노출 여부

실제 기기에서 테스트하지 않았다면 실제 기기 테스트 완료라고 쓰지 않는다.

---

# 39. 구현 순서

## Phase 1
프로젝트 구조 + 라우팅 + Stitch UI 기반 정적 화면

## Phase 2
Neon migration + Journey CRUD

## Phase 3
사진 선택 + 로컬 EXIF + Blob 업로드

## Phase 4
Day / Moment clustering

## Phase 5
Story / Timeline / Map 실데이터 연결

## Phase 6
OpenAI Vision + Story 생성

## Phase 7
Memory Interview

## Phase 8
Share read-only link

## Phase 9
반응형 / 접근성 / 오류 상태

## Phase 10
README + QA + Vercel 배포 검증

---

# 40. 완료 기준

다음 흐름이 실제 브라우저에서 끝까지 동작해야 MVP 완료로 본다.

```text
Library
↓
Create Journey
↓
Select Photos
↓
Read EXIF
↓
Upload
↓
Reconstruct
↓
Story / Timeline / Map
↓
Memory Interview
↓
Story updated
↓
Refresh
↓
Journey persists
↓
Create Share Link
↓
Open shared Storybook in read-only mode
```

이 흐름이 완성되기 전에는 P2 기능을 추가하지 않는다.

---

# 41. Codex에게 최종적으로 강조할 사항

- Stitch는 시각 reference다.
- 이 문서가 기능 source of truth다.
- 화면에 보이는 모든 장식을 기능으로 해석하지 마라.
- 가짜 성능/보안/GPS 숫자를 구현하지 마라.
- 로그인 구현하지 마라.
- 공동 작업 구현하지 마라.
- Search 구현하지 마라.
- Audio/Voice 구현하지 마라.
- Google Maps UI를 복제하지 마라.
- Sample Storybook은 Demo임을 명확히 하라.
- AI는 사용자 기억을 창작하지 마라.
- 핵심 흐름을 먼저 완성하라.
- 코드를 과도하게 추상화하지 마라.
- 사용자가 이후 수정하기 쉬운 구조로 작성하라.
