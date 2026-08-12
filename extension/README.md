# 메이플 옥션 연결 Chrome 확장 프로그램 설치 가이드

이 확장 프로그램은 로그인된 메이플 옥션 세션을 사용하여 실시간 시세를 조회합니다.

## 설치 방법

### 1. Chrome 확장 프로그램 개발자 모드 활성화

1. Chrome 브라우저를 엽니다
2. 주소창에 `chrome://extensions/` 입력
3. 우측 상단의 **"개발자 모드"** 토글을 **켭니다** (ON)

### 2. 확장 프로그램 로드

1. **"압축해제된 확장 프로그램을 로드합니다"** 버튼 클릭
2. 이 프로젝트의 `extension` 폴더를 선택
3. 확장 프로그램이 설치되면 "Maple Item Recommend Auction Connector" 가 목록에 나타납니다

### 3. 메이플 옥션 로그인

1. 새 탭에서 https://auction.maplestory.nexon.com/ 접속
2. 넥슨 계정으로 로그인
3. 캐릭터를 선택하여 경매장 진입

### 4. 앱 실행

1. 개발 서버 실행: `npm run dev`
2. http://localhost:3000 접속
3. 캐릭터 검색 후 "옥션 기반 최적 템셋 자동 추천" 섹션에서:
   - Account ID 입력
   - Character ID 입력  
   - World ID 입력
4. "🚀 모든 장비 자동 검색 & 최적 템셋 추천" 버튼 클릭

## Account ID / Character ID / World ID 찾는 방법

### Chrome 개발자 도구 사용

1. 메이플 옥션 페이지에서 `F12` 키를 눌러 개발자 도구 열기
2. **Network** 탭 선택
3. 경매장에서 아무 검색이나 실행
4. Network 탭에서 `searches/tool-tip` 또는 `searches` 요청 찾기
5. **Payload** 또는 **Request Payload** 탭 선택
6. 다음 값들 확인:
   ```json
   {
     "accountId": 108912176,
     "characterId": 29662388,
     "worldId": 8
   }
   ```

## 문제 해결

### "확장 프로그램이 설치되지 않았습니다" 오류
- Chrome 확장 프로그램 페이지(`chrome://extensions/`)에서 확장이 **활성화** 되어 있는지 확인
- 확장 프로그램을 다시 로드하거나 Chrome을 재시작

### "옥션 검색에 실패했습니다" 오류
- 메이플 옥션에 **로그인**되어 있는지 확인
- 경매장 탭이 **열려 있는지** 확인
- **경매장 탭을 새로고침(F5)** 해주세요 (확장 프로그램 업데이트 후 필수)
- Account ID, Character ID, World ID가 **정확한지** 확인

### 확장 프로그램 업데이트 후
1. `chrome://extensions`에서 확장 프로그램 **새로고침** (🔄 버튼)
2. **옥션 탭 새로고침** (F5) - 중요!
3. 앱 페이지도 새로고침 (F5)

### "CORS 에러" 또는 "권한 에러"
- `extension/manifest.json` 파일에서 `host_permissions`를 확인
- Vercel 배포 시에는 배포된 도메인을 추가해야 합니다:
  ```json
  "host_permissions": [
    "https://auction.maplestory.nexon.com/*",
    "https://api.mskr.nexon.com/*",
    "http://localhost:3000/*",
    "https://*.vercel.app/*"
  ]
  ```

## 보안 및 개인정보

- **Account ID, Character ID, World ID는 서버로 전송되지 않습니다**
- 모든 검색은 브라우저 내에서 실행됩니다
- 확장 프로그램은 로그인 정보를 저장하지 않습니다
- 옥션 검색 결과만 앱으로 전달됩니다

## 개발자 정보

- 확장 프로그램 코드: `extension/background.js`
- 앱 연결 브리지: `extension/app-bridge.js`
- 통신 방식: `window.postMessage` (같은 브라우저 내)
