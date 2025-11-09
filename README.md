# 패키지 설치
npm install sass
npm install react-router-dom

# 폴더 구조
/FE (Root Directory)
├── node_modules/
├── public/
│   ├── index.html
│   └── *.svg (공통 에셋)
├── src/
│   ├── assets/              # 이미지, 폰트 등 정적 파일
│   ├── components/          # 재사용 가능한 작은 UI 요소 (예: Timer.jsx)
│   ├── pages/               # 라우팅 되는 페이지 컴포넌트 (예: Main.jsx, PracticeGame.jsx)
│   ├── sass/                # 전역 및 모듈화된 SCSS 스타일 시트
│   │   ├── _variables.scss  # 공통 변수 (색상, 폰트 등)
│   │   ├── main.scss        # 메인/전역 스타일
│   │   └── practice.scss    # 연습 게임 관련 스타일
│   ├── App.jsx              # (선택 사항) 최상위 래퍼 컴포넌트
│   └── main.jsx             # React 진입점 및 라우터 설정 파일
├──index.html
├── package.json
└── README.md
