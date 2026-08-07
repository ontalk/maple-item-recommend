// 밀리초(ms) 단위로 랜덤하게 대기하는 함수 (매크로 방지용)
const sleep = (min, max) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 💡 1. 단일 아이템의 모든 페이지를 순회하며 데이터를 수집하는 함수
async function fetchAllPagesForItem(itemName) {
  let page = 1;
  let hasNextPage = true;
  let collectedItems = []; // 한 아이템의 모든 페이지 매물을 담을 배열

  while (hasNextPage) {
    console.log(`📦 [${itemName}] ${page}페이지 검색 중...`);
    
    try {
      // 넥슨 경매장 검색 API 호출 (페이지 번호 포함)
      // ※ 실제 넥슨 API 엔드포인트와 파라미터 구조에 맞게 수정하셔야 합니다.
      const response = await fetch(`/v1/market/web/items/searches?itemName=${encodeURIComponent(itemName)}&page=${page}`, {
        // 인증 헤더 포함...
      });

      if (!response.ok) {
         throw new Error(`API 에러: ${response.status}`);
      }

      const data = await response.json();
      
      // 현재 페이지의 매물 데이터를 배열에 추가
      if (data.items && data.items.length > 0) {
        collectedItems.push(...data.items);
      }

      // 다음 페이지가 있는지 확인 (API 응답 데이터 구조에 따라 다름)
      // 예: data.hasNext, data.totalPage 등 넥슨 API 응답에 맞춰 조건 작성
      if (data.hasNextPage === false || data.items.length === 0) {
        hasNextPage = false;
      } else {
        page++;
        // 🚨 [매우 중요] 페이지를 넘길 때도 사람처럼 딜레이를 주어야 합니다! (1초 ~ 2초)
        await sleep(1000, 2000); 
      }
    } catch (error) {
      console.error(`[${itemName}] ${page}페이지 검색 중 오류:`, error);
      break; // 에러 발생 시 무한루프 방지
    }
  }

  return collectedItems;
}

// 💡 2. 수집된 데이터를 바탕으로 전투력/가격 효율을 분석하는 함수
function analyzeBestItem(collectedItems) {
  if (collectedItems.length === 0) return null;

  console.log(`📊 수집된 총 ${collectedItems.length}개의 매물 분석 시작...`);
  
  // 예시: (전투력 증가량 / 가격) 효율이 가장 좋은 순으로 정렬
  const analyzed = collectedItems.map(item => {
    const cp = item.combat_power_increase || 0;
    const price = item.price || 1; 
    return {
      ...item,
      efficiency: cp / price 
    };
  }).sort((a, b) => b.efficiency - a.efficiency); // 내림차순 정렬

  // 가장 효율이 좋은(1순위) 매물 반환
  return analyzed[0]; 
}

// 💡 3. 전체 검색 리스트를 관리하는 메인 함수 (최상위 루프)
async function runAutoSearch(targetItemNames) {
  const finalRecommendations = [];

  for (const itemName of targetItemNames) {
    // A. 해당 아이템의 모든 페이지 매물 싹 긁어오기 (내부에 페이지 넘김 딜레이 포함)
    const allListings = await fetchAllPagesForItem(itemName);

    // B. 다 긁어왔으면 메모리 상에서 분석 (서버 요청 X, 빠름)
    const bestPick = analyzeBestItem(allListings);
    
    if (bestPick) {
      finalRecommendations.push(bestPick);
      console.log(`✅ [${itemName}] 최적 매물 발견: ${bestPick.price} 메소`);
    } else {
      console.log(`❌ [${itemName}] 매물이 없습니다.`);
    }

    // C. 🚨 [매우 중요] 다음 아이템 검색으로 넘어가기 전 휴식! (페이지 넘김보다 길게 2초 ~ 4초)
    console.log(`⏳ 다음 아이템 검색 전 대기 중...`);
    await sleep(2000, 4000); 
  }

  console.log('🎉 모든 추천 아이템 분석이 완료되었습니다!', finalRecommendations);
  return finalRecommendations;
}