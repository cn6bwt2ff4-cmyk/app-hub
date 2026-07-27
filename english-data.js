/* ============================================
   英语重学计划 - 数据
   ============================================ */

const ENGLISH_DATA = {
  meta: {
    title: '英语重启计划',
    total: 180, // 6个月
    desc: '毕业13年，重新学好英语，能说出来'
  },

  // 3个阶段
  stages: [
    {
      id: 1,
      name: '激活期',
      months: '第1-2月',
      goal: '听懂日常对话，敢开口说简单句',
      tip: '这个阶段重点是"听+模仿"，不要追求语法完美，先让嘴巴动起来。影子跟读是核心方法：听一句→暂停→模仿说一句→对比。',
      dailyTime: 40,
      tasks: [
        '影子跟读 15分钟',
        '场景对话 10分钟',
        '听力输入 10分钟',
        '词汇复习 5分钟'
      ]
    },
    {
      id: 2,
      name: '输出期',
      months: '第3-4月',
      goal: '能聊5-10分钟，表达观点',
      tip: '开始尝试"自由说"：看完一段材料后，用自己的话复述。不要背稿，允许犯错，重点是把意思表达出来。',
      dailyTime: 45,
      tasks: [
        '影子跟读 15分钟',
        '自由复述 15分钟',
        '话题输出 10分钟',
        '词汇复习 5分钟'
      ]
    },
    {
      id: 3,
      name: '实战期',
      months: '第5-6月',
      goal: '流利交流，能讨论具体话题',
      tip: '找真人练口语（语言交换App），每周至少2次30分钟对话。看原版YouTube/美剧，适应不同口音。',
      dailyTime: 50,
      tasks: [
        '原版材料输入 20分钟',
        '口语实战 20分钟',
        '纠音+词汇 10分钟'
      ]
    }
  ],

  // 30个核心生活场景（第1-2月每天学一个，循环）
  scenes: [
    { id: 1,  category: '打招呼', en: "How's it going?", zh: "最近怎么样？", reply_en: "Pretty good, thanks. You?", reply_zh: "挺好的，谢谢。你呢？" },
    { id: 2,  category: '打招呼', en: "Long time no see!", zh: "好久不见！", reply_en: "Yeah, it's been a while. How have you been?", reply_zh: "是啊，有阵子了。你最近怎么样？" },
    { id: 3,  category: '打招呼', en: "What do you do?", zh: "你是做什么工作的？", reply_en: "I work in marketing. How about you?", reply_zh: "我做市场营销。你呢？" },
    { id: 4,  category: '日常', en: "Could you say that again?", zh: "能再说一遍吗？", reply_en: "Sure, I said...", reply_zh: "当然，我说的是……" },
    { id: 5,  category: '日常', en: "I don't quite follow you.", zh: "我不太明白你的意思。", reply_en: "Let me explain it differently.", reply_zh: "我换个方式解释一下。" },
    { id: 6,  category: '日常', en: "What do you mean?", zh: "你什么意思？", reply_en: "I mean...", reply_zh: "我的意思是……" },
    { id: 7,  category: '点餐', en: "Can I see the menu, please?", zh: "请给我看一下菜单好吗？", reply_en: "Of course, here you go.", reply_zh: "当然，给您。" },
    { id: 8,  category: '点餐', en: "I'll have the same.", zh: "我要一样的。", reply_en: "Great choice!", reply_zh: "好选择！" },
    { id: 9,  category: '点餐', en: "Could I get the check, please?", zh: "请结账。", reply_en: "Sure, right away.", reply_zh: "好的，马上。" },
    { id: 10, category: '购物', en: "How much is this?", zh: "这个多少钱？", reply_en: "It's 25 dollars.", reply_zh: "25美元。" },
    { id: 11, category: '购物', en: "Do you have this in a different size?", zh: "这个有别的尺码吗？", reply_en: "Let me check for you.", reply_zh: "我帮您看看。" },
    { id: 12, category: '购物', en: "Can I try this on?", zh: "我能试穿一下吗？", reply_en: "Sure, the fitting room is over there.", reply_zh: "可以，试衣间在那边。" },
    { id: 13, category: '问路', en: "How do I get to the station?", zh: "去车站怎么走？", reply_en: "Go straight and turn left at the second light.", reply_zh: "直走，第二个红绿灯左转。" },
    { id: 14, category: '问路', en: "Is it far from here?", zh: "离这远吗？", reply_en: "No, about 10 minutes' walk.", reply_zh: "不远，走路约10分钟。" },
    { id: 15, category: '问路', en: "Can you show me on the map?", zh: "能在地图上指给我看吗？", reply_en: "Sure, let me open it.", reply_zh: "好的，我打开地图。" },
    { id: 16, category: '工作', en: "Let's get started.", zh: "我们开始吧。", reply_en: "Sounds good.", reply_zh: "好的。" },
    { id: 17, category: '工作', en: "Could you send me the details?", zh: "能把详情发给我吗？", reply_en: "I'll email you right away.", reply_zh: "我马上发邮件给你。" },
    { id: 18, category: '工作', en: "When is the deadline?", zh: "截止日期是什么时候？", reply_en: "It's due next Friday.", reply_zh: "下周五。" },
    { id: 19, category: '工作', en: "Let's wrap up for today.", zh: "今天就到这吧。", reply_en: "Good idea, see you tomorrow.", reply_zh: "好主意，明天见。" },
    { id: 20, category: '社交', en: "What are you up to this weekend?", zh: "这周末你有什么打算？", reply_en: "Not much, maybe just relax at home.", reply_zh: "没什么，可能就在家休息。" },
    { id: 21, category: '社交', en: "Want to grab a coffee?", zh: "想喝杯咖啡吗？", reply_en: "Sure, I'd love to.", reply_zh: "好啊，我很想。" },
    { id: 22, category: '社交', en: "Thanks for having me.", zh: "感谢你的招待。", reply_en: "You're welcome anytime!", reply_zh: "随时欢迎你！" },
    { id: 23, category: '社交', en: "Let's keep in touch.", zh: "保持联系。", reply_en: "Definitely! Let me get your number.", reply_zh: "一定！给我你的号码。" },
    { id: 24, category: '表达观点', en: "I think that's a great idea.", zh: "我觉得这是个好主意。", reply_en: "I'm glad you think so.", reply_zh: "很高兴你这么想。" },
    { id: 25, category: '表达观点', en: "To be honest, I'm not sure.", zh: "说实话，我不太确定。", reply_en: "That's fair. Let's think about it.", reply_zh: "有道理，我们再想想。" },
    { id: 26, category: '表达观点', en: "In my opinion...", zh: "在我看来……", reply_en: "Go on, I'm listening.", reply_zh: "继续说，我在听。" },
    { id: 27, category: '表达观点', en: "I completely agree with you.", zh: "我完全同意你的看法。", reply_en: "Great minds think alike!", reply_zh: "英雄所见略同！" },
    { id: 28, category: '困难求助', en: "I'm having trouble with this.", zh: "这个我有困难。", reply_en: "Let me give you a hand.", reply_zh: "我帮你一把。" },
    { id: 29, category: '困难求助', en: "Could you help me for a second?", zh: "能帮我一下吗？", reply_en: "No problem, what do you need?", reply_zh: "没问题，你需要什么？" },
    { id: 30, category: '困难求助', en: "I don't know how to say this in English.", zh: "我不知道这个用英语怎么说。", reply_en: "What are you trying to say?", reply_zh: "你想说什么？" }
  ],

  // 每日核心词汇（高频实用词，按周循环）
  words: [
    { en: 'actually', zh: '实际上，其实', example: "Actually, I think you're right." },
    { en: 'basically', zh: '基本上', example: "Basically, we need more time." },
    { en: 'definitely', zh: '一定，肯定', example: "I definitely want to go." },
    { en: 'probably', zh: '可能，大概', example: "It'll probably rain tomorrow." },
    { en: 'absolutely', zh: '绝对地', example: "Absolutely! That sounds great." },
    { en: 'exactly', zh: '正是，完全', example: "That's exactly what I mean." },
    { en: 'honestly', zh: '老实说', example: "Honestly, I don't know." },
    { en: 'literally', zh: '字面上地，简直', example: "I literally just got home." },
    { en: 'obviously', zh: '很明显地', example: "Obviously, he's upset." },
    { en: 'seriously', zh: '认真地', example: "Are you serious?" },
    { en: 'supposed to', zh: '应该', example: "I'm supposed to be there at 3." },
    { en: 'used to', zh: '过去常常', example: "I used to play basketball." },
    { en: 'look forward to', zh: '期待', example: "I look forward to seeing you." },
    { en: 'figure out', zh: '弄明白', example: "I need to figure it out." },
    { en: 'catch up', zh: '叙旧，赶上', example: "Let's catch up soon!" },
    { en: 'hang out', zh: '闲逛，聚会', example: "Want to hang out later?" },
    { en: 'take care of', zh: '处理，照顾', example: "I'll take care of it." },
    { en: 'come up with', zh: '想出，提出', example: "She came up with a plan." },
    { en: 'get along', zh: '相处融洽', example: "We get along well." },
    { en: 'give up', zh: '放弃', example: "Don't give up!" }
  ],

  // 推荐学习资源
  resources: [
    { name: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish', desc: 'BBC官方英语学习，免费', type: '听力+口语' },
    { name: 'TED Talks', url: 'https://www.ted.com', desc: '优质演讲，可双语字幕', type: '听力' },
    { name: 'YouTube自动字幕', url: 'https://www.youtube.com', desc: '任何英文视频都能开CC字幕', type: '综合' },
    { name: 'HelloTalk', url: 'https://www.hellotalk.com', desc: '和外国人免费语言交换', type: '口语实战' },
    { name: 'Tandem', url: 'https://www.tandem.net', desc: '语言交换App，找语伴', type: '口语实战' },
    { name: 'English Central', url: 'https://www.englishcentral.com', desc: '看视频练发音，AI评分', type: '发音' },
    { name: 'YouGlish', url: 'https://youglish.com', desc: '搜任何单词的真实发音场景', type: '发音' },
    { name: 'Grammarly', url: 'https://www.grammarly.com', desc: '英语写作语法纠正', type: '写作' }
  ]
};
