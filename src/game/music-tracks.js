function arrangeMusicTrack({ title, source, bpm, melody, roots, cycles = 2 }) {
  return ({
  title,
  source,
  bpm,
  cycles,
  melody,
  bass: melody.map((note, index) => index % 4 === 0 ? roots[Math.floor(index / 4) % roots.length] : null),
  harmony: melody.map((note, index) => note !== null && index % 2 === 0 ? note - 12 : null)
  });
}

export const MUSIC_TRACKS = [
  {
    title: '方块疾行 · 科罗贝尼基', source: '公版俄罗斯民谣改编', bpm: 118, cycles: 3,
    melody: [76, 71, 72, 74, 72, 71, 69, 69, 72, 76, 74, 72, 71, 71, 72, 74, 76, 72, 69, 69, null, 74, 77, 81, 79, 77, 76, 72, 76, 74, 72, 71],
    bass: [45, null, null, null, 45, null, null, null, 41, null, null, null, 41, null, null, null, 45, null, null, null, 38, null, null, null, 41, null, null, null, 40, null, 43, null],
    harmony: [64, null, null, null, 64, null, 60, null, 64, null, null, null, 62, null, 64, null, 64, null, 60, null, 62, null, 65, null, 67, null, 65, null, 64, null, 62, null]
  },
  {
    title: '山王逼近 · 山魔王宫殿', source: '格里格公版作品改编', bpm: 132, cycles: 3,
    melody: [71, 72, 74, 76, 74, 72, 71, 68, 71, 72, 74, 76, 74, 72, 71, null, 70, 71, 73, 75, 73, 71, 70, 67, 70, 71, 73, 75, 73, 71, 70, null],
    bass: [40, null, 40, null, 43, null, 40, null, 40, null, 40, null, 43, null, 40, null, 39, null, 39, null, 42, null, 39, null, 39, null, 39, null, 42, null, 39, null],
    harmony: [59, null, 60, null, 62, null, 59, null, 59, null, 60, null, 62, null, 59, null, 58, null, 59, null, 61, null, 58, null, 58, null, 59, null, 61, null, 58, null]
  },
  {
    title: '极速追击 · 康康舞曲', source: '奥芬巴赫公版作品改编', bpm: 126, cycles: 3,
    melody: [79, 79, 79, 81, 83, 81, 79, 77, 76, 76, 76, 77, 79, 77, 76, 74, 72, 72, 72, 74, 76, 74, 72, 71, 69, 69, 71, 72, 74, 76, 77, 79],
    bass: [43, null, 43, null, 47, null, 43, null, 40, null, 40, null, 43, null, 38, null, 36, null, 36, null, 40, null, 36, null, 33, null, 35, null, 38, null, 40, null],
    harmony: [67, null, 67, null, 71, null, 67, null, 64, null, 64, null, 67, null, 62, null, 60, null, 60, null, 64, null, 60, null, 57, null, 59, null, 62, null, 64, null]
  },
  {
    title: '城垣余火 · 原创战曲', source: '词垒守卫原创', bpm: 104, cycles: 3,
    melody: [74, null, 77, 76, 74, null, 72, 69, 70, null, 74, 72, 69, null, 67, 65, 69, null, 72, 74, 77, null, 76, 72, 74, null, 72, 69, 67, null, 69, 72],
    bass: [38, null, null, null, 38, null, 45, null, 41, null, null, null, 36, null, 43, null, 38, null, null, null, 34, null, 41, null, 36, null, null, null, 33, null, 36, null],
    harmony: [62, null, null, null, null, null, 60, null, 58, null, null, null, 57, null, 55, null, 57, null, null, null, 62, null, 60, null, 58, null, null, null, 55, null, 57, null]
  },
  arrangeMusicTrack({
    title: '黎明颂歌 · 欢乐颂', source: '贝多芬公版作品改编', bpm: 112,
    melody: [64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,null,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60,null],
    roots: [36,36,41,41,36,36,43,36]
  }),
  arrangeMusicTrack({
    title: '月下侦察 · 致爱丽丝', source: '贝多芬公版作品改编', bpm: 116,
    melody: [76,75,76,75,76,71,74,72,69,null,60,64,69,71,null,64,68,71,72,null,64,76,75,76,75,76,71,74,72,69,null,null],
    roots: [45,40,45,40,45,40,45,45]
  }),
  arrangeMusicTrack({
    title: '禁卫急行 · 土耳其进行曲', source: '莫扎特公版作品改编', bpm: 128,
    melody: [71,69,68,69,72,74,72,71,72,76,77,76,74,72,71,69,68,69,72,74,72,71,72,76,77,76,74,72,71,69,69,null],
    roots: [45,45,40,40,45,45,40,45]
  }),
  arrangeMusicTrack({
    title: '王庭舞步 · G 大调小步舞曲', source: '佩措尔德公版作品改编', bpm: 106,
    melody: [67,62,64,66,67,62,62,69,66,67,69,71,72,62,62,null,64,66,64,62,61,64,67,71,72,71,69,67,66,64,62,null],
    roots: [43,38,43,38,40,36,43,38]
  }),
  arrangeMusicTrack({
    title: '春日出征 · 四季·春', source: '维瓦尔第公版作品改编', bpm: 124,
    melody: [76,75,76,71,69,69,71,68,64,68,71,76,75,76,71,69,69,71,68,64,68,71,76,74,72,71,69,68,66,64,64,null],
    roots: [40,45,40,45,40,45,43,40]
  }),
  arrangeMusicTrack({
    title: '长河回旋 · 蓝色多瑙河', source: '小约翰·施特劳斯公版作品改编', bpm: 108,
    melody: [67,71,74,74,71,67,64,67,72,76,79,79,76,72,67,69,74,77,81,81,77,74,69,71,76,79,83,81,79,76,74,null],
    roots: [43,40,41,43,38,43,40,43]
  }),
  arrangeMusicTrack({
    title: '赤红哨站 · 哈巴涅拉', source: '比才公版作品改编', bpm: 104,
    melody: [69,69,69,68,69,71,69,68,66,66,66,65,66,68,66,65,64,69,68,66,65,64,62,64,65,66,68,66,65,64,64,null],
    roots: [45,40,45,40,45,40,43,45]
  }),
  arrangeMusicTrack({
    title: '骑兵破阵 · 威廉退尔序曲', source: '罗西尼公版作品改编', bpm: 138,
    melody: [64,64,64,64,64,64,64,64,67,67,67,67,69,69,69,69,72,72,72,72,74,72,69,65,64,67,72,76,74,72,69,null],
    roots: [36,36,43,45,48,41,36,43]
  }),
  arrangeMusicTrack({
    title: '焰火凯旋 · 皇家焰火音乐', source: '亨德尔公版作品改编', bpm: 122,
    melody: [67,69,71,72,74,72,71,69,67,71,74,79,78,76,74,72,71,69,67,66,67,69,71,72,74,76,74,72,71,69,67,null],
    roots: [43,38,43,38,40,43,38,43]
  }),
  arrangeMusicTrack({
    title: '新大陆守望 · 自新大陆', source: '德沃夏克公版作品改编', bpm: 94,
    melody: [64,67,67,64,62,60,62,64,67,64,62,null,64,67,69,67,64,62,60,62,64,67,64,62,60,null,60,62,64,67,64,null],
    roots: [36,43,36,41,36,43,41,36]
  }),
  arrangeMusicTrack({
    title: '黑旗狂舞 · 匈牙利舞曲第五号', source: '勃拉姆斯公版作品改编', bpm: 132,
    melody: [69,72,71,69,68,69,72,76,76,75,73,72,71,72,69,null,69,72,71,69,68,69,72,76,79,77,76,74,72,71,69,null],
    roots: [45,40,45,40,45,40,43,45]
  }),
  arrangeMusicTrack({
    title: '绿袖林地 · 绿袖子', source: '英格兰公版传统民谣改编', bpm: 98,
    melody: [69,72,74,76,77,76,74,71,67,69,71,72,69,69,68,69,71,68,64,66,68,69,66,66,65,66,68,65,62,64,65,null],
    roots: [45,41,43,45,40,45,41,45]
  }),
  arrangeMusicTrack({
    title: '旧日战友 · 友谊地久天长', source: '苏格兰公版传统民谣改编', bpm: 102,
    melody: [60,65,65,65,69,67,65,67,69,65,65,69,72,74,74,null,72,69,69,65,67,65,67,69,65,62,62,60,65,65,65,null],
    roots: [41,41,36,43,41,36,43,41]
  }),
  arrangeMusicTrack({
    title: '樱落城门 · 樱花', source: '日本公版传统民谣改编', bpm: 92,
    melody: [69,69,71,69,69,71,69,71,72,71,69,71,68,64,68,null,64,68,69,71,68,69,68,64,63,64,68,69,71,68,69,null],
    roots: [45,45,40,45,40,45,40,45]
  }),
  arrangeMusicTrack({
    title: '迷雾集市 · 斯卡布罗集市', source: '英格兰公版传统民谣改编', bpm: 96,
    melody: [69,69,76,76,71,72,71,69,76,79,81,79,76,77,74,76,69,72,74,72,71,69,67,69,69,67,64,67,69,69,69,null],
    roots: [45,40,45,43,45,40,43,45]
  }),
  arrangeMusicTrack({
    title: '海港夜巡 · 醉水手', source: '爱尔兰公版传统船歌改编', bpm: 126,
    melody: [69,69,69,69,69,69,69,69,72,76,76,72,69,65,67,69,67,67,67,67,67,67,67,67,71,74,74,71,67,64,66,67],
    roots: [45,45,48,45,43,43,47,43]
  })
];
