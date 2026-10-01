# QA

검증 환경: 로컬 Vite 개발 서버, Cursor 브라우저. 실제 휴대폰이나 배포 URL에서는 확인하지 않았다.

## 자동

- `npm test`: Day 분리, 가까운 사진의 Moment 묶음, GPS 없는 구간의 추정, 날짜 없는 사진 묶음. 통과.
- `npm run build`: 클라이언트 빌드 성공. MapLibre가 포함되어 번들이 크다.

## API (`http://localhost:5174`)

- Journey 생성, JPEG 3장 업로드, 재구성.
- 결과: 2일, 3 Moment, 장소명과 `confirmed`, 메타데이터 기반 문장.
- Memory 저장 후 문장에 답변이 반영됨.
- Story 직접 수정.
- 공유 링크 읽기 전용 조회, 다른 owner key의 삭제는 404, 공유 해제 후 링크 404.
- 첫 재구성 시도는 서버 변수 오류로 실패했고, 수정 후 위 흐름은 성공했다. 실패 전에 올라간 사진은 지워지지 않았다.

## 브라우저

- 320px에 가까운 좁은 창과 390×844, 1280×900.
- Library 빈 상태, 샘플 3권, 내 Journey 카드.
- 샘플 Germany Spring 2026 Story. Sample 표시, 편집과 공유 버튼 없음. Unsplash 출처 링크 있음.
- 사용자 Journey의 Story, Timeline, Map. 지도에 확대 축소와 MapLibre 표기, `Reconstructed from photo locations.`
- Memory Interview에서 Skip 후 다음 질문으로 이동.
- Create 화면의 드롭 영역과 사진 없음 상태. 데스크톱 내비게이션은 Library, Create Journey, Sample Storybooks.
- 샘플 표지 이미지는 로드되었다.

## 하지 않은 것

- 실제 기기.
- HEIC 파일.
- 카메라 EXIF가 들어 있는 원본 사진. API 검증은 업로드와 함께 보낸 날짜와 좌표를 사용했다.
- OpenAI, Neon, Vercel Blob, Vercel 배포.
- 네트워크 끊김을 브라우저에서 재현하는 테스트.
