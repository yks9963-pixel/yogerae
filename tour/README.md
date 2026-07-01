# YOGERAE Tour

외국인 관광객용 "메뉴판 사진 번역(B) + 주변 맛집(A)" 페이지. YOGERAE 레포 내 독립 경로(`/tour`)로 얹은 테스트 MVP입니다. 기존 YOGERAE 파일·폴더는 건드리지 않습니다.

## 폴더 구조

```
/tour
├── index.html          # 진입점 (랜딩 / scan / find 뷰를 한 페이지에서 라우팅)
├── README.md
├── .env.example         # GEMINI_API_KEY / GEMINI_MODEL
├── .gitignore           # .env, .vercel 등 제외
├── vercel.json          # api/scan.js 함수 설정(maxDuration)
├── api/
│   ├── scan.js          # POST /api/scan — Gemini 멀티모달(이미지→읽기+번역+JSON) 프록시 (서버 전용)
│   └── prompt.js        # Korean Menu Translator v1 시스템 프롬프트
└── assets/
    ├── css/
    │   └── style.css   # 모바일 우선 스타일 + scan 카드/스피너 + find 지도/리스트/상세 스타일
    └── js/
        ├── app.js       # 뷰 라우팅 + 언어 상태 + i18n 딕셔너리 + scan/find 로직
        ├── config.example.js  # 구글맵 프론트 키 템플릿 (실제 config.js는 커밋 안 함)
        └── data/
            └── restaurants.js # mock 식당 데이터 (전주 3곳, STEP2와 동일한 menu 스키마)
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

### 구글맵(Find 화면) 로컬 설정

Find 화면의 지도는 브라우저에서 직접 그리므로 별도의 프론트 전용 키가 필요합니다(아래 "구글맵 키 발급 및 도메인 제한" 참고).

```bash
cp assets/js/config.example.js assets/js/config.js
# assets/js/config.js를 열어 GOOGLE_MAPS_API_KEY 값 채우기
```

`config.js`는 `.gitignore`에 포함되어 커밋되지 않습니다. 이 파일이 없거나 키가 비어 있어도 앱은 죽지 않고, 지도 영역에 "Map unavailable" 안내만 표시되며 필터/리스트/거리 계산/상세 메뉴는 정상 동작합니다.

## 환경변수

| 변수 | 위치 | 필수 | 설명 |
|---|---|---|---|
| `GEMINI_API_KEY` | `.env` (서버 전용) | 예 | 메뉴 사진을 읽고 번역하는 Gemini 멀티모달 호출용. `/tour/api/scan.js`에서만 서버사이드로 읽음 |
| `GEMINI_MODEL` | `.env` (서버 전용) | 아니오 | 기본값 `gemini-2.5-flash`. 이미지 입력을 지원하는 멀티모달 모델이어야 함 |
| `GOOGLE_MAPS_API_KEY` | `assets/js/config.js` (**프론트 전용**) | Find 지도 사용 시 | Maps JavaScript API 키. 브라우저 요청에 노출되는 것이 정상이며, 위 서버 전용 키와는 성격이 다름 |

> ⚠️ `GOOGLE_MAPS_API_KEY`(프론트, `config.js`)와 `GEMINI_API_KEY`(서버, `.env`)는 **서로 다른 키·서로 다른 발급처**입니다. 지도 키는 Google Cloud 콘솔, Gemini 키는 Google AI Studio에서 발급하며 절대 같은 값을 재사용하지 마세요 — 프론트 키는 도메인 제한을 걸어도 요청 URL에 그대로 노출되고, 서버 키는 절대 노출되면 안 됩니다.

### Gemini 키 발급 (필수)

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 API 키 발급
2. 발급받은 키를 로컬 `.env`의 `GEMINI_API_KEY`에, 배포 환경은 Vercel 프로젝트의 환경변수 설정에 등록
3. 무료 티어 기준 `gemini-2.5-flash`(멀티모달) 사용을 기본값으로 함 — 다른 모델로 바꾸려면 `GEMINI_MODEL`을 override

### 구글맵 키 발급 및 도메인 제한 (필수)

1. [Google Cloud 콘솔](https://console.cloud.google.com/) → APIs & Services → Credentials → "Create credentials" → API key
2. 발급된 키의 "Application restrictions"를 **HTTP referrers (web sites)** 로 설정하고, 배포 도메인(예: `https://your-tour-domain.vercel.app/*`)과 로컬 테스트용(`http://localhost:*`)을 등록
3. "API restrictions"에서 **Maps JavaScript API**만 허용하도록 제한
4. 이 키를 로컬은 `assets/js/config.js`에, 배포 환경은 Vercel의 정적 자산 빌드 과정(또는 별도 배포 스크립트)에서 동일한 `config.js`를 생성하도록 설정 — **이 키는 서버 환경변수(`.env`)에 넣지 않습니다.** 서버 환경변수는 빌드 시 브라우저로 전달되지 않으므로, 프론트에서 쓰려면 정적 파일로 존재해야 합니다.
5. 도메인 제한이 없는 지도 키를 그대로 배포하지 마세요 — 노출 자체는 불가피하지만, 제한이 없으면 타인이 내 키로 과금을 유발할 수 있습니다.

## 화면 구성

- **상단바:** 뒤로가기 버튼(랜딩에서는 숨김) + 현재 언어 배지
- **랜딩:** 로고(🍜) + 타이틀/서브타이틀 + 언어 선택 칩(EN/中/日) + 진입 버튼 2개(📷 Scan Menu / 📍 Find Food Near Me)
- **하단 탭 네비:** Home · Scan · Find — 클릭 시 뷰 전환
- **언어 선택:** 칩 클릭 시 `localStorage`에 저장되고, 랜딩·scan 화면의 텍스트가 즉시 해당 언어로 전환됨
- **Scan (STEP 2):** 사진 선택(후면 카메라 우선) → 미리보기 → 프론트에서 canvas로 긴 변 1600px로 리사이즈 후 base64 인코딩 → `/api/scan` 호출 → 로딩 스피너 → 결과 카드(이모지·번역명·원어/로마자·가격·맵기·설명·알레르기/식이 태그) 렌더링. 태그는 빨강(확실 함유)/노랑(주의) 구분, 결과 하단에 "confirm with staff" 경고 표시. 에러 시 사용자 메시지 + 재시도 버튼
- **Find (STEP 3):** find 탭 최초 진입 시 위치 권한 요청 + 구글맵 SDK를 lazy-load. 지도에 사용자 위치(파란 점)와 mock 식당 마커 표시. 필터칩(Not spicy/Vegetarian/Halal-friendly, 다중 선택 AND 조건)으로 리스트·마커 동시 필터링. 리스트 카드에 이모지·이름·카테고리·Haversine 거리·평점·대표메뉴 표시. **마커 클릭** → 리스트의 해당 카드로 스크롤 + 하이라이트. **카드 클릭** → 상세 서브뷰로 전환, STEP2의 메뉴 카드 렌더러(`buildMenuCard`)를 그대로 재사용해 번역 메뉴 표시. 상세에서 뒤로가기 → find 리스트로 복귀(랜딩으로 가지 않음). 위치 권한 거부/미지원/8초 내 무응답 시 전주시청 좌표를 기본 중심으로 쓰고 거리는 `—`로 표시하며 앱은 정상 동작. 지도 키가 없으면 지도 영역에 안내만 뜨고 나머지 기능은 그대로 동작

## `/api/scan` 처리 흐름

```
POST /api/scan { image: base64, targetLang }
  → 입력 검증 (base64 형식·크기·JPEG/PNG/WebP 매직바이트)
  → 이미지 + targetLang을 Gemini(Korean Menu Translator v1 시스템 프롬프트, responseSchema로 JSON 구조 강제)에 1회 전달
    — 이미지에서 직접 메뉴를 읽고, 번역하고, 구조화까지 한 번에 처리 (별도 OCR 단계 없음)
  → 응답을 JSON 배열로 파싱, 빈 배열이면 "메뉴를 못 찾음"으로 처리
  → { items: [...] } 반환 (필드 스키마는 이전 Vision+Claude 2단계 버전과 100% 동일)
```

에러는 `{ error: { code, message } }` 형태로 반환되며, 코드는 `INVALID_IMAGE` / `NO_TEXT_DETECTED` / `GEMINI_API_ERROR` / `GEMINI_PARSE_ERROR` / `TIMEOUT` / `SERVER_MISCONFIGURED` 중 하나입니다. Gemini 호출 1회에 타임아웃(8.5s)을 두어 Vercel Hobby 플랜의 함수 실행 제한(~10초) 안에서 실패를 명확히 반환합니다.

**이전 버전과의 차이:** 원래는 Google Vision(OCR) → Claude(번역) 2단계·키 2개 구조였으나, Gemini의 멀티모달 입력으로 이미지를 직접 읽게 하여 1단계·키 1개(`GEMINI_API_KEY`)로 단순화했습니다. 프론트 업로드/리사이즈/카드 렌더링과 응답 JSON 스키마는 전혀 바뀌지 않았습니다.

**여전히 일부러 미룬 것:** 요청 빈도 제한(rate limit), Origin 검증 등 공개 배포 단계의 남용 방어는 이번 범위에 포함하지 않았습니다 (서버리스 특성상 영구 저장소 없이는 견고하게 구현하기 어려워 실제 배포 준비 단계로 이연). 지금은 이미지 타입/크기 기본 검증만 있습니다.

## Find 데이터 구조 (`assets/js/data/restaurants.js`)

```js
window.TOUR_RESTAURANTS = [
  {
    id, name, category, lat, lng, rating, signature_dish,
    tags: ["not_spicy" | "vegetarian" | "halal_friendly"],
    menu: [ /* STEP2 /api/scan 응답 항목과 완전히 동일한 스키마 */ ]
  }
];
```

파생 로직(거리 계산, 필터링, 마커/카드 렌더링)은 전부 `app.js`에 있고 이 파일은 순수 데이터만 가집니다. 실제 데이터 연동 시 이 배열을 API 응답으로 교체하기만 하면 됩니다. 현재는 전주 한옥마을 인근 mock 3곳(Keunmma / Bibim House / Hanok Pajeon)이 들어 있습니다.

**STEP 3에서 일부러 미룬 것:** 식당명 다국어(`name_i18n`)는 실제 상호명이 보통 언어 무관하게 통용되는 점을 고려해 이번 MVP에서는 구현하지 않았습니다(영문 상호명 그대로 표시). Google Maps 마커는 클래식 `google.maps.Marker`를 사용했으며, 향후 `AdvancedMarkerElement`로 교체 가능합니다.

## STEP 진행 현황

- [x] STEP 1 — 폴더 골격 + 랜딩(언어선택 + 두 진입 버튼) + 화면 라우팅 뼈대 + i18n 딕셔너리 뼈대
- [x] STEP 2 — B 플로우: 카메라/업로드 → 프록시 OCR+번역 → 결과 카드
- [x] STEP 3 — A 플로우: 구글맵 + 위치 + mock 식당 리스트 → 상세
- [ ] STEP 4 — 메뉴 번역 프롬프트(v1) 프록시에 연결 (STEP 2에서 선반영됨 — 추가 튜닝은 이후에)
- [ ] STEP 5 — PWA(매니페스트+서비스워커) — 오프라인/홈화면

## 보안 메모

- `GEMINI_API_KEY`는 서버(`/tour/api/scan.js`)에서만 `process.env`로 읽으며, 코드·응답·프론트 어디에도 노출되지 않습니다.
- 프론트는 `/api/scan`만 호출하며 Gemini API를 직접 호출하지 않습니다.
- `.env`는 `.gitignore`에 포함되어 있으며, 커밋되는 것은 `.env.example` 뿐입니다.
- `GOOGLE_MAPS_API_KEY`(`assets/js/config.js`)는 브라우저에 노출되는 것이 정상인 프론트 전용 키입니다 — 위 두 서버 키와 절대 혼용하지 말고, Google Cloud 콘솔에서 **HTTP referrer(도메인) 제한**을 반드시 설정하세요(발급 방법은 위 "구글맵 키 발급 및 도메인 제한" 참고). `config.js`도 `.gitignore`에 포함되어 있으며, 커밋되는 것은 `config.example.js` 뿐입니다.
