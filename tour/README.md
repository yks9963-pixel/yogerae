# YOGERAE Tour

외국인 관광객용 "메뉴판 사진 번역(B) + 주변 맛집(A)" 페이지. YOGERAE 레포 내 독립 경로(`/tour`)로 얹은 테스트 MVP입니다. 기존 YOGERAE 파일·폴더는 건드리지 않습니다.

## 폴더 구조

```
/tour
├── index.html          # 진입점 (랜딩 / scan / find 뷰를 한 페이지에서 라우팅)
├── README.md
├── .env.example         # ANTHROPIC_API_KEY / GOOGLE_VISION_API_KEY / CLAUDE_MODEL
├── .gitignore           # .env, .vercel 등 제외
├── vercel.json          # api/scan.js 함수 설정(maxDuration)
├── api/
│   ├── scan.js          # POST /api/scan — Vision OCR + Claude 번역 프록시 (서버 전용)
│   └── prompt.js        # Korean Menu Translator v1 시스템 프롬프트
└── assets/
    ├── css/
    │   └── style.css   # 모바일 우선 스타일 (오렌지 프라이머리 팔레트) + scan 카드/스피너
    └── js/
        └── app.js      # 뷰 라우팅 + 언어 상태 + i18n(EN/中/日) 딕셔너리 + scan 업로드/렌더링
```

## 로컬 실행법

### 정적 UI만 (STEP 1 수준, API 없이)

```bash
cd tour
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

### `/api/scan` 포함 전체 기능 (Vercel CLI 필요)

```bash
npm i -g vercel   # 최초 1회
cd tour
cp .env.example .env       # 이후 .env에 실제 키 채워넣기
vercel dev
# 안내된 로컬 주소로 접속 (예: http://localhost:3000)
```

`.env`는 커밋되지 않습니다 (`.gitignore`에 포함). 실제 키는 로컬 `.env` 또는 Vercel 프로젝트의 환경변수 설정에만 넣으세요.

## 환경변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 예 | Claude 메뉴 번역 호출용. `/tour/api/scan.js`에서만 서버사이드로 읽음 |
| `GOOGLE_VISION_API_KEY` | 예 | Google Vision OCR(`DOCUMENT_TEXT_DETECTION`) 호출용 |
| `CLAUDE_MODEL` | 아니오 | 기본값 `claude-haiku-4-5-20251001`. 다른 모델로 override 가능 |

## 화면 구성

- **상단바:** 뒤로가기 버튼(랜딩에서는 숨김) + 현재 언어 배지
- **랜딩:** 로고(🍜) + 타이틀/서브타이틀 + 언어 선택 칩(EN/中/日) + 진입 버튼 2개(📷 Scan Menu / 📍 Find Food Near Me)
- **하단 탭 네비:** Home · Scan · Find — 클릭 시 뷰 전환
- **언어 선택:** 칩 클릭 시 `localStorage`에 저장되고, 랜딩·scan 화면의 텍스트가 즉시 해당 언어로 전환됨
- **Scan (STEP 2):** 사진 선택(후면 카메라 우선) → 미리보기 → 프론트에서 canvas로 긴 변 1600px로 리사이즈 후 base64 인코딩 → `/api/scan` 호출 → 로딩 스피너 → 결과 카드(이모지·번역명·원어/로마자·가격·맵기·설명·알레르기/식이 태그) 렌더링. 태그는 빨강(확실 함유)/노랑(주의) 구분, 결과 하단에 "confirm with staff" 경고 표시. 에러 시 사용자 메시지 + 재시도 버튼
- **Find 화면:** STEP 3에서 채워질 placeholder만 존재

## `/api/scan` 처리 흐름

```
POST /api/scan { image: base64, targetLang }
  → 입력 검증 (base64 형식·크기·JPEG/PNG/WebP 매직바이트)
  → Google Vision DOCUMENT_TEXT_DETECTION으로 OCR
  → OCR 텍스트 + targetLang을 Claude(Korean Menu Translator v1 시스템 프롬프트)에 전달
  → 응답을 JSON 배열로 파싱 후 { items: [...] } 반환
```

에러는 `{ error: { code, message } }` 형태로 반환되며, 코드는 `INVALID_IMAGE` / `NO_TEXT_DETECTED` / `VISION_API_ERROR` / `TRANSLATION_API_ERROR` / `TRANSLATION_PARSE_ERROR` / `TIMEOUT` / `SERVER_MISCONFIGURED` 중 하나입니다. Vision·Claude 호출 각각에 타임아웃(4s/5s)을 두어 Vercel Hobby 플랜의 함수 실행 제한(~10초) 안에서 실패를 명확히 반환합니다.

**STEP 2에서 일부러 미룬 것:** 요청 빈도 제한(rate limit), Origin 검증 등 공개 배포 단계의 남용 방어는 이번 범위에 포함하지 않았습니다 (서버리스 특성상 영구 저장소 없이는 견고하게 구현하기 어려워 실제 배포 준비 단계로 이연). 지금은 이미지 타입/크기 기본 검증만 있습니다.

## STEP 진행 현황

- [x] STEP 1 — 폴더 골격 + 랜딩(언어선택 + 두 진입 버튼) + 화면 라우팅 뼈대 + i18n 딕셔너리 뼈대
- [x] STEP 2 — B 플로우: 카메라/업로드 → 프록시 OCR+번역 → 결과 카드
- [ ] STEP 3 — A 플로우: 구글맵 + 위치 + mock 식당 리스트 → 상세
- [ ] STEP 4 — 메뉴 번역 프롬프트(v1) 프록시에 연결 (STEP 2에서 선반영됨 — 추가 튜닝은 이후에)
- [ ] STEP 5 — PWA(매니페스트+서비스워커) — 오프라인/홈화면

## 보안 메모

- `ANTHROPIC_API_KEY`/`GOOGLE_VISION_API_KEY`는 서버(`/tour/api/scan.js`)에서만 `process.env`로 읽으며, 코드·응답·프론트 어디에도 노출되지 않습니다.
- 프론트는 `/api/scan`만 호출하며 Vision/Claude API를 직접 호출하지 않습니다.
- `.env`는 `.gitignore`에 포함되어 있으며, 커밋되는 것은 `.env.example` 뿐입니다.
