# 🎃 호박 (Hobak)

**당신 근처의 따뜻한 중고거래** — Supabase 연동 및 3D 아이소메트릭 공간 인터랙션(`antigravity-design-expert`)을 적용한 정적 웹 애플리케이션입니다.

## ✨ 주요 기능

- **상품 목록 & 필터링**: 검색어, 카테고리, 동네 필터와 `거래가능만 보기` 토글 지원
- **거래 상태 관리 & 배지 표시**: `판매중` / `예약중` / `거래완료` 상태 배지 표시 및 `거래완료` 게시글 카드 흐림 처리
- **상품 상세 & 실시간 소통**: 상세 모달 조회, 찜하기(`item_likes`), 상품별 실시간 채팅(`item_chat_messages`) 지원
- **작성자 전용 관리 기능**: 로그인한 본인이 작성한 게시글에 한해 수정, 삭제, 상태 변경(`판매중` / `예약중` / `거래완료`) 지원
- **Supabase Auth 회원 인증**: 이메일·비밀번호 회원가입(닉네임 필수) 및 로그인 모달, 비로그인 시 글쓰기 클릭 시 로그인 우선 유도 후 글쓰기 전환
- **3D 아이소메트릭 공간 뷰**: `3D 공간뷰` 전환 및 글래스모피즘·공간 깊이감을 살린 UI 모션

## 📁 프로젝트 구조

```text
hobak/
├── index.html                  # 메인 진입점 (헤더, 뷰 컨테이너, 푸터)
├── .env.example                # 환경 변수 예시 파일 (실제 키 미포함)
├── .gitignore                  # .env 및 임시 파일 커밋 제외 설정
├── css/
│   ├── style.css               # 전역 디자인 토큰, 헤더/푸터, 공용 레이아웃
│   ├── list-page.css           # 상품 목록 그리드, 필터바, 상태 태그 스타일
│   ├── detail-page.css         # 상품 상세 모달, 채팅 영역, 작성자 컨트롤 스타일
│   ├── write-page.css          # 글쓰기/수정 폼 스타일
│   └── auth.css                # 로그인/회원가입 모달 및 헤더 계정 버튼 스타일
└── js/
    ├── supabase-config.js      # Supabase 공개 클라이언트 설정 (URL 및 anon key)
    ├── auth.js                 # Supabase Auth 인증/프로필 닉네임 관리
    ├── data.js                 # Supabase DB CRUD 및 초기 데이터 동기화
    ├── list-page.js            # 목록 렌더링 및 검색/필터/상태 배지 처리
    ├── detail-page.js          # 상세 모달, 채팅, 찜, 수정/삭제/상태 변경 처리
    ├── write-page.js           # 글쓰기/수정 폼 초기화 및 제출 처리
    ├── antigravity-motion.js   # 3D 아이소메트릭 뷰 및 인터랙션 모션
    └── app.js                  # 라우팅, 전역 이벤트 바인딩 및 앱 부트스트랩
```

## 🔐 보안 및 환경 설정 안내

- 실제 민감한 키(`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`)는 로컬 `.env` 파일에만 보관되며, `.gitignore`에 의해 Git 커밋 및 GitHub 업로드에서 완전히 제외됩니다.
- 브라우저에 노출되는 `js/supabase-config.js`에는 공개용 `anon` 키만 포함되어 있으며 `service_role` 키는 절대 포함하지 않습니다.
- 로컬에서 MCP 설정 등을 참고하려면 `.env.example`을 복사해 `.env` 파일을 생성한 뒤 본인의 키를 입력하세요.

## 🚀 실행 및 배포 방법

별도의 빌드 과정(bundler/build step)이 필요 없는 순수 정적 웹사이트(`index.html`, `css/`, `js/`)입니다.

### 로컬 실행
프로젝트 루트 폴더에서 간단한 정적 웹 서버로 실행할 수 있습니다.

```bash
python -m http.server 8000
```

### 정적 호스팅 배포 (GitHub Pages / Vercel / Netlify)
- **GitHub Pages**: Repository `Settings` → `Pages` → `Build and deployment`에서 Source를 `Deploy from a branch` (`main` / `/ (root)`)로 선택하면 즉시 배포됩니다.
- **Vercel / Netlify**: 저장소를 연결하고 Build Command 없이 Publish/Output 디렉터리를 루트(`.`)로 지정해 바로 배포할 수 있습니다.

> **배포 전 확인**: 실서비스로 공개할 경우 Supabase Dashboard에서 RLS 정책을 작성자 본인 검증(`auth.uid()`) 기준으로 강화하고, 배포 도메인을 Authentication `Site URL` 및 `Redirect URLs`에 등록하는 것을 권장합니다.
