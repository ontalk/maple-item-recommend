# 메이플스토리 장비 강화 추천 시스템

캐릭터 닉네임만 입력하면 현재 장비 상태를 분석하고, 메소 대비 효율이 가장 좋은 강화 경로를 추천해드립니다.

## 주요 기능

- ⚡ **실시간 캐릭터 장비 분석**: 넥슨 공식 API로 현재 장비 조회
- 💰 **옥션 기반 최적 템셋 추천**: 실제 경매장 시세를 자동 검색하여 가격 대비 효율이 가장 좋은 장비 추천
- 📊 **비용 대비 효율 계산**: 스타포스/잠재/에디셔널/교체 모두 메소 단위 계산
- 🔄 **여러 세트 옵션 비교**: 보스 장신구, 여명, 칠흑, 앱솔랩스, 아케인셰이드, 에테르넬 세트 자동 비교

## 빠른 시작

### 1. 개발 환경 설정

```bash
npm install
npm run dev
```

http://localhost:3000 에서 앱 실행

### 2. Chrome 확장 프로그램 설치 (옥션 자동 검색용)

**옥션 기반 템셋 추천 기능을 사용하려면 반드시 설치 필요**

1. Chrome에서 `chrome://extensions/` 접속
2. 우측 상단 **"개발자 모드"** 활성화
3. **"압축해제된 확장 프로그램을 로드합니다"** 클릭
4. 이 프로젝트의 `extension` 폴더 선택

자세한 설치 방법: [extension/README.md](extension/README.md)

### 3. 메이플 옥션 로그인

1. https://auction.maplestory.nexon.com/ 접속
2. 넥슨 계정으로 로그인 후 캐릭터 선택

### 4. 앱에서 사용

1. 캐릭터 닉네임 입력 → 장비 분석
2. 목표 전투력 입력 (예: 2.5억)
3. **"옥션 기반 최적 템셋 자동 추천"** 섹션에서:
   - Account ID, Character ID, World ID 입력 ([찾는 방법](extension/README.md#account-id--character-id--world-id-찾는-방법))
   - **"🚀 모든 장비 자동 검색 & 최적 템셋 추천"** 버튼 클릭
4. 12개 부위의 모든 세트 옵션이 자동으로 검색되어 최적 조합 추천

## 기술 스택

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **API**: 넥슨 메이플스토리 Open API
- **확장 프로그램**: Chrome Extension Manifest V3
- **배포**: Vercel

## 프로젝트 구조

```
├── extension/              # Chrome 확장 프로그램
│   ├── manifest.json      # 확장 프로그램 설정
│   ├── background.js      # 옥션 검색 로직
│   └── app-bridge.js      # 앱 ↔ 확장 통신
├── src/
│   ├── app/               # Next.js 페이지
│   ├── components/        # React 컴포넌트
│   ├── lib/
│   │   ├── equipment-database.ts    # 장비 DB
│   │   ├── auction-extension.ts     # 옥션 API 클라이언트
│   │   └── recommendation-engine.ts # 추천 로직
│   └── types/             # TypeScript 타입
```

## 데이터 출처

- 넥슨 메이플스토리 Open API
- 인벤/남붕이 스타포스 비용표
- 커뮤니티 공유 큐브 확률 데이터
- 경매장 실시간 시세 (서버별 상이)

## 주의사항

- 예상 비용은 확률 기반 계산값입니다
- 실제 강화 결과와 다를 수 있습니다
- 큐브/스타포스 가격은 서버/시기별 변동
- **투자 전 본인 판단 하에 결정하세요**

## 라이선스

이 서비스는 넥슨과 무관한 비공식 팬 프로젝트입니다.

## Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
