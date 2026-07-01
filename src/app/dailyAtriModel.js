import fallbackImageOne from '../assets/official-hero/atri-kv-01.webp';
import fallbackImageTwo from '../assets/official-hero/atri-kv-02.webp';
import fallbackImageThree from '../assets/official-hero/atri-kv-03.webp';
import { safeMemoryFilename } from '../lib/downloads.js';
import { memoryTitle } from '../lib/memoryContent.js';
import { memoryGalleryImageUrl, memoryOriginalUrl } from '../lib/memoryMedia.js';

const DAILY_ATRI_CARDS = [
  {
    mood: '记录模式',
    title: 'マスター，今天的幸福数据由我来保存',
    note: '别小看高性能仿生人。你的好事、疲惫和偷偷逞强的部分，我都会认真记录，不会擅自丢掉。',
    question: '今天要交给我保存的一件小幸福是什么？',
    theme: 'soft',
    voiceSrc: '/audio/daily-atri/record-mode.mp3',
    voiceText: 'マスター、今日の幸せなデータは、わたしが保存します。高性能ですから、絶対に忘れません。',
  },
  {
    mood: '诊断模式',
    title: '检测结果：マスター需要休息',
    note: '人类的耐久值比想象中低，还总是假装没问题。既然被我发现了，就请坐好，停止不必要的逞强。',
    question: '现在最能让你恢复一点能量的事情是什么？',
    theme: 'mint',
    voiceSrc: '/audio/daily-atri/rest-diagnosis.mp3',
    voiceText: '診断結果、マスターは休息が必要です。無理をするのは禁止です。わたしがそばで見ていますから。',
  },
  {
    mood: '保管模式',
    title: '说不出口的话，可以先放进我的记忆区',
    note: '我不会催你立刻解释，也不会把重要的话误删。等マスター准备好了，再亲自把它取回来。',
    question: '今天有没有一句话，想先让我替你保管？',
    theme: 'blue',
    voiceSrc: '/audio/daily-atri/memory-keep.mp3',
    voiceText: '言えない言葉があるなら、わたしに預けてください。マスターが取りに来るまで、ちゃんと守ります。',
  },
  {
    mood: '观测模式',
    title: '观测完成：你今天也有好好前进',
    note: '即使没有发生了不起的大事件，也不能判定今天没有价值。你走过的路、完成的小任务，我都看见了。',
    question: '今天最值得被判定为“完成”的任务是什么？',
    theme: 'violet',
    voiceSrc: '/audio/daily-atri/progress-observe.mp3',
    voiceText: '観測完了。マスターは今日もちゃんと前に進みました。小さな任務でも、わたしは見逃しません。',
  },
  {
    mood: '任务模式',
    title: '今日任务：提交一件小小的幸福',
    note: '任务难度很低，请不要擅自放弃。好吃的东西、好看的天空，或者有人等你回来，任意一项都可以提交。',
    question: 'マスター今天的任务成果是什么？',
    theme: 'amber',
    voiceSrc: '/audio/daily-atri/tiny-happiness.mp3',
    voiceText: '本日の任務です。小さな幸せを一つ見つけてください。提出できたら、わたしが確認します。',
  },
  {
    mood: '暂存模式',
    title: '无法整理的心情，也可以暂存在这里',
    note: '暂时找不到答案，不代表程序失败。先把它交给我，我会替マスター看好，不让它被随便删除。',
    question: '今天有什么心情，需要暂时存放在我的记忆里？',
    theme: 'slate',
    voiceSrc: '/audio/daily-atri/emotion-cache.mp3',
    voiceText: '整理できない気持ちは、ここに一時保存しましょう。マスターの大事なものなら、わたしが守ります。',
  },
  {
    mood: '约定模式',
    title: '今天没完成也没关系，明天我还在这里',
    note: '所以不要露出那种失落的表情。没完成的部分可以明天继续，我会负责提醒你，也会负责等你回来。',
    question: '明天见面时，マスター希望先完成什么？',
    theme: 'rose',
    voiceSrc: '/audio/daily-atri/tomorrow-promise.mp3',
    voiceText: '今日できなかったことは、明日また続けましょう。わたしはここで、マスターを待っています。',
  },
];

const FALLBACK_DAILY_IMAGES = [
  {
    id: 'official-kv-01',
    title: '蓝色记忆',
    caption: '从官方主视觉里抽取今天的蓝色片段。',
    imageUrl: fallbackImageOne,
    downloadUrl: fallbackImageOne,
    filename: 'daily-atri-blue-memory.webp',
  },
  {
    id: 'official-kv-02',
    title: '夏日回望',
    caption: '今天也从相册里保存一份亚托莉的回望。',
    imageUrl: fallbackImageTwo,
    downloadUrl: fallbackImageTwo,
    filename: 'daily-atri-summer-look.webp',
  },
  {
    id: 'official-kv-03',
    title: '深海光点',
    caption: '把今天的光收进 ATRI Memories。',
    imageUrl: fallbackImageThree,
    downloadUrl: fallbackImageThree,
    filename: 'daily-atri-deep-sea-light.webp',
  },
];

const RITUAL_LABELS = ['记录', '回看', '提交'];

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / 86_400_000);
}

function uniqueDailyMemories(memories = []) {
  const seen = new Set();
  return memories.filter((memory) => {
    const downloadUrl = memoryOriginalUrl(memory);
    if (!downloadUrl) return false;
    const key = memory.id || downloadUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dailyImageFromMemory(memory) {
  return {
    id: memory.id,
    title: memoryTitle(memory),
    caption: memory.caption || memory.description || '今天随机抽到的 ATRI 记忆。',
    imageUrl: memoryGalleryImageUrl(memory, 720),
    downloadUrl: memoryOriginalUrl(memory),
    filename: memory.created_at ? safeMemoryFilename(memory) : `${memory.id || 'daily-atri'}.jpg`,
  };
}

function dailyImagePool(memories) {
  const memoryImages = uniqueDailyMemories(memories).map(dailyImageFromMemory);
  return memoryImages.length ? memoryImages : FALLBACK_DAILY_IMAGES;
}

export function dailyAtriModel({ date = new Date(), memories = [] } = {}) {
  const dayIndex = Math.abs(dayOfYear(date) - 1);
  const card = DAILY_ATRI_CARDS[dayIndex % DAILY_ATRI_CARDS.length];
  const imagePool = dailyImagePool(memories);
  const dailyImage = imagePool[(dayIndex * 7) % imagePool.length];
  const dayNumber = dayIndex + 1;

  return {
    ...card,
    image: dailyImage,
    cardNumber: `ATRI-${String(dayNumber).padStart(3, '0')}`,
    memoryLine: `${card.mood} / ${dailyImage.title}`,
    ritualItems: RITUAL_LABELS.map((label, index) => ({
      label,
      value: index === 0 ? card.mood : index === 1 ? dailyImage.title : '回答今日小问题',
    })),
    dateLabel: new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(date),
  };
}
