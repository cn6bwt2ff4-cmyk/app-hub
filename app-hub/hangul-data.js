/* ============================================
   韩语40音学习数据
   sound: 中文谐音（近似）
   tip: 发音要领
   ============================================ */

const HANGUL_DATA = {
  meta: {
    title: '韩语40音',
    total: 40,
    desc: '21个元音 + 19个辅音'
  },
  // 7天学习计划
  plan: [
    {
      day: 1,
      title: '基本元音',
      count: 10,
      tip: '掌握10个基本元音的发音和书写。注意口型变化，ㅗ/ㅛ是圆唇音。',
      letters: [
        { letter: 'ㅏ', roman: 'a',  sound: '啊',  tip: '嘴自然张开，舌放平，类似"啊"', type: '元音', example: '아이 (ai, 孩子)' },
        { letter: 'ㅑ', roman: 'ya', sound: '呀',  tip: '在ㅏ基础上加y音，类似"呀"', type: '元音', example: '야구 (yagu, 棒球)' },
        { letter: 'ㅓ', roman: 'eo', sound: '哦',  tip: '嘴半张，舌稍后缩，类似"哦"的短音', type: '元音', example: '어디 (eodi, 哪里)' },
        { letter: 'ㅕ', roman: 'yeo',sound: '哟',  tip: '在ㅓ基础上加y音，类似"哟"', type: '元音', example: '여자 (yeoja, 女人)' },
        { letter: 'ㅗ', roman: 'o',  sound: '喔',  tip: '嘴唇拢圆，类似"喔"', type: '元音', example: '오이 (oi, 黄瓜)' },
        { letter: 'ㅛ', roman: 'yo', sound: '哟',  tip: '在ㅗ基础上加y音，圆唇', type: '元音', example: '요리 (yori, 料理)' },
        { letter: 'ㅜ', roman: 'u',  sound: '乌',  tip: '嘴唇拢圆前突，类似"乌"', type: '元音', example: '우유 (uyu, 牛奶)' },
        { letter: 'ㅠ', roman: 'yu', sound: '哟',  tip: '在ㅜ基础上加y音，圆唇', type: '元音', example: '유리 (yuri, 玻璃)' },
        { letter: 'ㅡ', roman: 'eu', sound: '呃',  tip: '嘴角横拉，舌根抬起，类似"呃"', type: '元音', example: '으악 (euak, 啊)' },
        { letter: 'ㅣ', roman: 'i',  sound: '衣',  tip: '嘴角横拉，类似"衣"', type: '元音', example: '이름 (ireum, 名字)' }
      ]
    },
    {
      day: 2,
      title: '基本辅音（前半）',
      count: 7,
      tip: '辅音发音类似汉语拼音，但气流强弱有别。ㄹ介于l和r之间。',
      letters: [
        { letter: 'ㄱ', roman: 'g',  sound: '哥', tip: '类似"哥"的轻音，舌根抵软腭', type: '辅音', example: '가수 (gasu, 歌手)' },
        { letter: 'ㄴ', roman: 'n',  sound: '讷', tip: '舌尖抵上齿龈，类似"讷"', type: '辅音', example: '나무 (namu, 树)' },
        { letter: 'ㄷ', roman: 'd',  sound: '得', tip: '类似"得"的轻音，舌尖抵上齿龈', type: '辅音', example: '다리 (dari, 桥)' },
        { letter: 'ㄹ', roman: 'r/l',sound: '勒', tip: '介于l和r之间，舌尖轻弹上齿龈', type: '辅音', example: '라면 (ramyeon, 拉面)' },
        { letter: 'ㅁ', roman: 'm',  sound: '摸', tip: '双唇闭合，类似"摸"', type: '辅音', example: '마음 (maeum, 心)' },
        { letter: 'ㅂ', roman: 'b',  sound: '波', tip: '类似"波"的轻音，双唇轻合', type: '辅音', example: '바다 (bada, 海)' },
        { letter: 'ㅅ', roman: 's',  sound: '丝', tip: '舌尖靠近上齿龈，类似"丝"', type: '辅音', example: '사과 (sagwa, 苹果)' }
      ]
    },
    {
      day: 3,
      title: '基本辅音（后半）',
      count: 7,
      tip: 'ㅇ在首音位置不发音，作韵尾发ng音。ㅊ/ㅋ/ㅌ/ㅍ/ㅎ是送气音。',
      letters: [
        { letter: 'ㅇ', roman: 'ng', sound: '(不发音)', tip: '在音节开头不发音，作韵尾发ng音', type: '辅音', example: '아니 (ani, 不是)' },
        { letter: 'ㅈ', roman: 'j',  sound: '兹', tip: '类似"兹"，舌面抵硬腭', type: '辅音', example: '자동차 (jadongcha, 汽车)' },
        { letter: 'ㅊ', roman: 'ch', sound: '呲', tip: 'ㅈ的送气音，气流更强', type: '辅音', example: '차 (cha, 茶)' },
        { letter: 'ㅋ', roman: 'k',  sound: '克', tip: 'ㄱ的送气音，类似"克"', type: '辅音', example: '코 (ko, 鼻子)' },
        { letter: 'ㅌ', roman: 't',  sound: '特', tip: 'ㄷ的送气音，类似"特"', type: '辅音', example: '토마토 (tomato, 番茄)' },
        { letter: 'ㅍ', roman: 'p',  sound: '坡', tip: 'ㅂ的送气音，类似"坡"', type: '辅音', example: '포도 (podo, 葡萄)' },
        { letter: 'ㅎ', roman: 'h',  sound: '喝', tip: '喉部送气，类似"喝"', type: '辅音', example: '하늘 (haneul, 天空)' }
      ]
    },
    {
      day: 4,
      title: '紧辅音',
      count: 5,
      tip: '紧音发音时声门紧张，气流更强。注意和松音的对比：ㄱ↔ㄲ、ㄷ↔ㄸ、ㅂ↔ㅃ、ㅅ↔ㅆ、ㅈ↔ㅉ。',
      letters: [
        { letter: 'ㄲ', roman: 'kk', sound: '哥(紧)', tip: 'ㄱ的紧音，声门紧张，气流更强', type: '紧辅音', example: '까치 (kkaji, 喜鹊)' },
        { letter: 'ㄸ', roman: 'tt', sound: '得(紧)', tip: 'ㄷ的紧音，声门紧张', type: '紧辅音', example: '또 (tto, 又)' },
        { letter: 'ㅃ', roman: 'pp', sound: '波(紧)', tip: 'ㅂ的紧音，声门紧张', type: '紧辅音', example: '빨리 (ppalli, 快)' },
        { letter: 'ㅆ', roman: 'ss', sound: '丝(紧)', tip: 'ㅅ的紧音，声门紧张', type: '紧辅音', example: '싸다 (ssada, 便宜)' },
        { letter: 'ㅉ', roman: 'jj', sound: '兹(紧)', tip: 'ㅈ的紧音，声门紧张', type: '紧辅音', example: '짜다 (jjada, 咸)' }
      ]
    },
    {
      day: 5,
      title: '复合元音（前半）',
      count: 6,
      tip: '复合元音由两个基本元音拼合而成。ㅐ/ㅔ发音接近，现代韩语中基本同音。',
      letters: [
        { letter: 'ㅐ', roman: 'ae', sound: '哎', tip: 'ㅏ+ㅣ，类似"哎"', type: '复合元音', example: '개 (gae, 狗)' },
        { letter: 'ㅒ', roman: 'yae',sound: '耶', tip: '在ㅐ基础上加y音', type: '复合元音', example: '얘기 (yaegi, 故事)' },
        { letter: 'ㅔ', roman: 'e',  sound: '诶', tip: 'ㅓ+ㅣ，类似"诶"，和ㅐ基本同音', type: '复合元音', example: '게 (ge, 螃蟹)' },
        { letter: 'ㅖ', roman: 'ye', sound: '耶', tip: '在ㅔ基础上加y音', type: '复合元音', example: '예의 (yeui, 礼仪)' },
        { letter: 'ㅘ', roman: 'wa', sound: '哇', tip: 'ㅗ+ㅏ，类似"哇"', type: '复合元音', example: '과자 (gwaja, 饼干)' },
        { letter: 'ㅙ', roman: 'wae',sound: '歪', tip: 'ㅗ+ㅐ，类似"歪"', type: '复合元音', example: '왜 (wae, 为什么)' }
      ]
    },
    {
      day: 6,
      title: '复合元音（后半）',
      count: 5,
      tip: '收尾的5个复合元音。ㅚ/ㅟ嘴唇要圆，ㅢ发音比较特殊（eu+i）。',
      letters: [
        { letter: 'ㅚ', roman: 'oe', sound: '外', tip: 'ㅗ+ㅣ，圆唇发"外"音', type: '复合元音', example: '외국 (oeguk, 外国)' },
        { letter: 'ㅝ', roman: 'wo', sound: '窝', tip: 'ㅜ+ㅓ，类似"窝"', type: '复合元音', example: '뭐 (mwo, 什么)' },
        { letter: 'ㅞ', roman: 'we', sound: '歪', tip: 'ㅜ+ㅔ，类似"歪"', type: '复合元音', example: '웨딩 (weding, 婚礼)' },
        { letter: 'ㅟ', roman: 'wi', sound: '位', tip: 'ㅜ+ㅣ，圆唇发"位"音', type: '复合元音', example: '위 (wi, 胃)' },
        { letter: 'ㅢ', roman: 'ui', sound: '诶伊', tip: 'ㅡ+ㅣ，先发"呃"再滑向"衣"', type: '复合元音', example: '의자 (uija, 椅子)' }
      ]
    },
    {
      day: 7,
      title: '总复习 + 拼读',
      count: 40,
      tip: '复习全部40音，并练习简单拼读。韩文是音节文字，辅音+元音组合即可成字，如 가(ㄱ+ㅏ)、나(ㄴ+ㅏ)。',
      letters: [],
      isReview: true,
      practice: [
        { word: '가나다',  roman: 'ganada',  mean: '甲乙丙（顺序）' },
        { word: '라마바',  roman: 'ramaba',  mean: '练读音' },
        { word: '사아자',  roman: 'saaja',   mean: '练读音' },
        { word: '차카타',  roman: 'chakata', mean: '练读音' },
        { word: '파하',    roman: 'paha',    mean: '练读音' },
        { word: '안녕',    roman: 'annyeong',mean: '你好' },
        { word: '사랑',    roman: 'sarang',  mean: '爱' },
        { word: '친구',    roman: 'chingu',  mean: '朋友' }
      ]
    }
  ]
};
