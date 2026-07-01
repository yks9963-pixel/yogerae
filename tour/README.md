# YOGERAE Tour

외국인 관광객용 "메뉴판 사진 번역(B) + 주변 맛집(A)" 페이지. YOGERAE 레포 내 독립 경로(`/tour`)로 얹은 테스트 MVP입니다. 기존 YOGERAE 파일·폴더는 건드리지 않습니다.

## 폴더 구조

```
/tour
├── index.html          # 진입점 (랜딩 / scan / find 뷰를 한 페이지에서 라우팅)
├── README.md
└── assets/
    ├── css/
    │   └── style.css   # 모바일 우선 스타일 (오렌지 프라이머리 팔레트)
    └── js/
        └── app.js      # 뷰 라우팅 + 언어 상태 + i18n(EN/中/日) 딕셔너리
```

STEP 2에서 `/tour/api/` (서버리스 프록시 뼈대)가 추가될 예정입니다.

## 로컬 실행법

정적 파일이므로 별도 빌드 없이 아무 로컬 서버로 열면 됩니다.

```bash
cd tour
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

또는 VS Code Live Server 등 원하는 정적 서버를 사용해도 됩니다.

## 화면 구성 (STEP 1)

- **상단바:** 뒤로가기 버튼(랜딩에서는 숨김) + 현재 언어 배지
- **랜딩:** 로고(🍜) + 타이틀/서브타이틀 + 언어 선택 칩(EN/中/日) + 진입 버튼 2개(📷 Scan Menu / 📍 Find Food Near Me)
- **하단 탭 네비:** Home · Scan · Find — 클릭 시 뷰 전환
- **언어 선택:** 칩 클릭 시 `localStorage`에 저장되고, 랜딩 화면의 모든 텍스트가 즉시 해당 언어로 전환됨. 이후 STEP에서 scan/find 화면에도 동일한 `state.lang` 값을 전달할 예정.
- **scan / find 화면:** STEP 2, 3에서 채워질 placeholder만 존재.

## STEP 진행 현황

- [x] STEP 1 — 폴더 골격 + 랜딩(언어선택 + 두 진입 버튼) + 화면 라우팅 뼈대 + i18n 딕셔너리 뼈대
- [ ] STEP 2 — B 플로우: 카메라/업로드 → 프록시 OCR+번역 → 결과 카드
- [ ] STEP 3 — A 플로우: 구글맵 + 위치 + mock 식당 리스트 → 상세
- [ ] STEP 4 — 메뉴 번역 프롬프트(v1) 프록시에 연결
- [ ] STEP 5 — PWA(매니페스트+서비스워커) — 오프라인/홈화면

## 보안 메모

- STEP 1은 정적 UI만 포함하며 외부 API 호출이나 API 키를 전혀 사용하지 않습니다.
- 이후 STEP에서 OCR/번역/지도 연동 시 API 키는 `.env`에만 두고, 프론트는 서버리스 프록시(`/api/*`)만 호출합니다.
