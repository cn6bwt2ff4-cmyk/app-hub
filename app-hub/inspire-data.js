/* ============================================
   美感灵感 - 每日艺术推荐数据
   ============================================ */

const INSPIRE_DATA = {
  // 精选美学网站（长期固定）
  sites: [
    { name: 'Behance', url: 'https://www.behance.net', desc: '全球顶尖设计师作品集', cat: '设计', color: '#1769ff' },
    { name: 'Dribbble', url: 'https://dribbble.com', desc: 'UI/视觉设计灵感', cat: '设计', color: '#ea4c89' },
    { name: 'Pinterest', url: 'https://www.pinterest.com', desc: '图片收藏与发现', cat: '综合', color: '#e60023' },
    { name: 'Unsplash', url: 'https://unsplash.com', desc: '高质量免费摄影', cat: '摄影', color: '#000000' },
    { name: 'Artsy', url: 'https://www.artsy.net', desc: '当代艺术作品拍卖', cat: '艺术', color: '#000000' },
    { name: 'Google Arts', url: 'https://artsandculture.google.com', desc: '全球博物馆高清藏品', cat: '艺术', color: '#4285f4' },
    { name: 'Awwwards', url: 'https://www.awwwards.com', desc: '最佳网页设计评选', cat: '设计', color: '#000000' },
    { name: 'Pinterest 设计', url: 'https://www.pinterest.com/search/pins/?q=aesthetic', desc: '美学风格图片搜索', cat: '综合', color: '#e60023' },
    { name: 'DeviantArt', url: 'https://www.deviantart.com', desc: '数字艺术与插画社区', cat: '插画', color: '#05cc47' },
    { name: 'ArtStation', url: 'https://www.artstation.com', desc: '游戏/影视概念艺术', cat: '插画', color: '#13aff0' },
    { name: 'Cosmos', url: 'https://cosmos.so', desc: '美学家创意社区', cat: '综合', color: '#000000' },
    { name: 'Lummi', url: 'https://lummi.io', desc: '免费高质量素材', cat: '设计', color: '#6366f1' }
  ],

  // 美学概念（每日轮换学习）
  concepts: [
    { title: '黄金分割', desc: '1:1.618的比例，自然界和艺术中最和谐的比例。达芬奇《维特鲁威人》、帕台农神庙都运用了它。' },
    { title: '色彩心理', desc: '红色热烈、蓝色宁静、黄色明快。了解色彩的情绪暗示，是培养美感的基础。' },
    { title: '留白', desc: '中国画叫"计白当黑"。空白不是没有，而是给眼睛呼吸的空间，让主体更突出。' },
    { title: '对比与统一', desc: '大小、明暗、虚实的对比制造张力；统一的色调和风格带来和谐。两者平衡是关键。' },
    { title: '三分法则', desc: '把画面横竖各分三份，主体放在交叉点上最吸引视线。摄影构图的第一课。' },
    { title: '负空间', desc: '主体周围的空白本身也能成为设计元素。FedEx logo里藏的箭头就是经典。' },
    { title: '重复与韵律', desc: '相同元素的重复产生节奏感，就像音乐的节拍。变化中的重复最动人。' },
    { title: '视觉层级', desc: '通过大小、色彩、位置引导视线。先看什么、后看什么，是设计的基本功。' },
    { title: '极简主义', desc: '少即是多。剔除一切多余，让本质浮现。苹果的设计哲学。' },
    { title: '包豪斯', desc: '20世纪最重要的设计流派。"形式追随功能"，影响了所有现代设计。' },
    { title: '和风美学', desc: '侘寂（wabi-sabi）：不完美、无常、质朴之美。枯山水、陶器都体现了这一点。' },
    { title: '光影', desc: '没有光就没有形。伦勃朗的画、摄影的黄金时刻，都是光影的魔法。' },
    { title: '质感', desc: '粗糙、光滑、柔软、坚硬。触觉的视觉化，让作品有了温度。' },
    { title: '对称之美', desc: '左右对称带来庄重稳定，不对称带来动感活力。选择哪种取决于想表达什么。' }
  ]
};
