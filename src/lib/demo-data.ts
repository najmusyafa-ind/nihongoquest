// src/lib/demo-data.ts
// Static flashcard data for demo/dev mode when DATABASE_URL is not configured.
// These are the same N5 cards used in db/seed.ts
// In production this file is never imported by the hot path.

import type { Flashcard, StudySession } from '@/types/entities';

export const DEMO_CARDS_N5: Flashcard[] = [
  { id: 'demo-n5-01', level: 'N5', kanji: '食べる', hiragana: 'たべる', romaji: 'taberu', meaningId: 'makan', meaningEn: 'to eat', exampleJp: '私はご飯を食べる', exampleId: 'Saya makan nasi', exampleEn: 'I eat rice', createdAt: new Date() },
  { id: 'demo-n5-02', level: 'N5', kanji: '飲む', hiragana: 'のむ', romaji: 'nomu', meaningId: 'minum', meaningEn: 'to drink', exampleJp: '水を飲む', exampleId: 'Minum air', exampleEn: 'To drink water', createdAt: new Date() },
  { id: 'demo-n5-03', level: 'N5', kanji: '見る', hiragana: 'みる', romaji: 'miru', meaningId: 'melihat', meaningEn: 'to see / to watch', exampleJp: '映画を見る', exampleId: 'Menonton film', exampleEn: 'To watch a movie', createdAt: new Date() },
  { id: 'demo-n5-04', level: 'N5', kanji: '聞く', hiragana: 'きく', romaji: 'kiku', meaningId: 'mendengar', meaningEn: 'to listen / to hear', exampleJp: '音楽を聞く', exampleId: 'Mendengarkan musik', exampleEn: 'To listen to music', createdAt: new Date() },
  { id: 'demo-n5-05', level: 'N5', kanji: '行く', hiragana: 'いく', romaji: 'iku', meaningId: 'pergi', meaningEn: 'to go', exampleJp: '学校に行く', exampleId: 'Pergi ke sekolah', exampleEn: 'To go to school', createdAt: new Date() },
  { id: 'demo-n5-06', level: 'N5', kanji: '来る', hiragana: 'くる', romaji: 'kuru', meaningId: 'datang', meaningEn: 'to come', exampleJp: '友達が来る', exampleId: 'Teman datang', exampleEn: 'A friend comes', createdAt: new Date() },
  { id: 'demo-n5-07', level: 'N5', kanji: null, hiragana: 'する', romaji: 'suru', meaningId: 'melakukan', meaningEn: 'to do', exampleJp: '勉強する', exampleId: 'Belajar', exampleEn: 'To study', createdAt: new Date() },
  { id: 'demo-n5-08', level: 'N5', kanji: '話す', hiragana: 'はなす', romaji: 'hanasu', meaningId: 'berbicara', meaningEn: 'to speak', exampleJp: '日本語を話す', exampleId: 'Berbicara bahasa Jepang', exampleEn: 'To speak Japanese', createdAt: new Date() },
  { id: 'demo-n5-09', level: 'N5', kanji: '読む', hiragana: 'よむ', romaji: 'yomu', meaningId: 'membaca', meaningEn: 'to read', exampleJp: '本を読む', exampleId: 'Membaca buku', exampleEn: 'To read a book', createdAt: new Date() },
  { id: 'demo-n5-10', level: 'N5', kanji: '書く', hiragana: 'かく', romaji: 'kaku', meaningId: 'menulis', meaningEn: 'to write', exampleJp: '手紙を書く', exampleId: 'Menulis surat', exampleEn: 'To write a letter', createdAt: new Date() },
  { id: 'demo-n5-11', level: 'N5', kanji: '買う', hiragana: 'かう', romaji: 'kau', meaningId: 'membeli', meaningEn: 'to buy', exampleJp: 'りんごを買う', exampleId: 'Membeli apel', exampleEn: 'To buy an apple', createdAt: new Date() },
  { id: 'demo-n5-12', level: 'N5', kanji: '売る', hiragana: 'うる', romaji: 'uru', meaningId: 'menjual', meaningEn: 'to sell', exampleJp: '車を売る', exampleId: 'Menjual mobil', exampleEn: 'To sell a car', createdAt: new Date() },
  { id: 'demo-n5-13', level: 'N5', kanji: '大きい', hiragana: 'おおきい', romaji: 'ookii', meaningId: 'besar', meaningEn: 'big / large', exampleJp: '大きい犬', exampleId: 'Anjing besar', exampleEn: 'A big dog', createdAt: new Date() },
  { id: 'demo-n5-14', level: 'N5', kanji: '小さい', hiragana: 'ちいさい', romaji: 'chiisai', meaningId: 'kecil', meaningEn: 'small / little', exampleJp: '小さい猫', exampleId: 'Kucing kecil', exampleEn: 'A small cat', createdAt: new Date() },
  { id: 'demo-n5-15', level: 'N5', kanji: '新しい', hiragana: 'あたらしい', romaji: 'atarashii', meaningId: 'baru', meaningEn: 'new', exampleJp: '新しい本', exampleId: 'Buku baru', exampleEn: 'A new book', createdAt: new Date() },
  { id: 'demo-n5-16', level: 'N5', kanji: '古い', hiragana: 'ふるい', romaji: 'furui', meaningId: 'lama / tua', meaningEn: 'old', exampleJp: '古い家', exampleId: 'Rumah tua', exampleEn: 'An old house', createdAt: new Date() },
  { id: 'demo-n5-17', level: 'N5', kanji: '高い', hiragana: 'たかい', romaji: 'takai', meaningId: 'mahal / tinggi', meaningEn: 'expensive / tall', exampleJp: '高いビル', exampleId: 'Gedung tinggi', exampleEn: 'A tall building', createdAt: new Date() },
  { id: 'demo-n5-18', level: 'N5', kanji: '安い', hiragana: 'やすい', romaji: 'yasui', meaningId: 'murah', meaningEn: 'cheap', exampleJp: '安い服', exampleId: 'Baju murah', exampleEn: 'Cheap clothes', createdAt: new Date() },
  { id: 'demo-n5-19', level: 'N5', kanji: '面白い', hiragana: 'おもしろい', romaji: 'omoshiroi', meaningId: 'menarik / lucu', meaningEn: 'interesting / funny', exampleJp: '面白い映画', exampleId: 'Film yang menarik', exampleEn: 'An interesting movie', createdAt: new Date() },
  { id: 'demo-n5-20', level: 'N5', kanji: '難しい', hiragana: 'むずかしい', romaji: 'muzukashii', meaningId: 'sulit', meaningEn: 'difficult', exampleJp: '難しい問題', exampleId: 'Soal yang sulit', exampleEn: 'A difficult question', createdAt: new Date() },
];

export const DEMO_CARDS_N4: Flashcard[] = [
  { id: 'demo-n4-01', level: 'N4', kanji: '使う', hiragana: 'つかう', romaji: 'tsukau', meaningId: 'menggunakan', meaningEn: 'to use', exampleJp: 'パソコンを使う', exampleId: 'Menggunakan komputer', exampleEn: 'To use a computer', createdAt: new Date() },
  { id: 'demo-n4-02', level: 'N4', kanji: '教える', hiragana: 'おしえる', romaji: 'oshieru', meaningId: 'mengajar / memberitahu', meaningEn: 'to teach / to tell', exampleJp: '英語を教える', exampleId: 'Mengajarkan bahasa Inggris', exampleEn: 'To teach English', createdAt: new Date() },
  { id: 'demo-n4-03', level: 'N4', kanji: '覚える', hiragana: 'おぼえる', romaji: 'oboeru', meaningId: 'mengingat / menghafal', meaningEn: 'to remember / to memorize', exampleJp: '単語を覚える', exampleId: 'Menghafal kosakata', exampleEn: 'To memorize vocabulary', createdAt: new Date() },
  { id: 'demo-n4-04', level: 'N4', kanji: '忘れる', hiragana: 'わすれる', romaji: 'wasureru', meaningId: 'lupa', meaningEn: 'to forget', exampleJp: '名前を忘れる', exampleId: 'Lupa nama', exampleEn: 'To forget a name', createdAt: new Date() },
  { id: 'demo-n4-05', level: 'N4', kanji: '始まる', hiragana: 'はじまる', romaji: 'hajimaru', meaningId: 'mulai (intransitif)', meaningEn: 'to begin (intransitive)', exampleJp: '授業が始まる', exampleId: 'Pelajaran dimulai', exampleEn: 'The class begins', createdAt: new Date() },
  { id: 'demo-n4-06', level: 'N4', kanji: '終わる', hiragana: 'おわる', romaji: 'owaru', meaningId: 'selesai', meaningEn: 'to end / to finish', exampleJp: '仕事が終わる', exampleId: 'Pekerjaan selesai', exampleEn: 'Work finishes', createdAt: new Date() },
  { id: 'demo-n4-07', level: 'N4', kanji: '送る', hiragana: 'おくる', romaji: 'okuru', meaningId: 'mengirim / mengantar', meaningEn: 'to send / to escort', exampleJp: 'メールを送る', exampleId: 'Mengirim email', exampleEn: 'To send an email', createdAt: new Date() },
  { id: 'demo-n4-08', level: 'N4', kanji: '受ける', hiragana: 'うける', romaji: 'ukeru', meaningId: 'menerima / mengikuti ujian', meaningEn: 'to receive / to take (exam)', exampleJp: '試験を受ける', exampleId: 'Mengikuti ujian', exampleEn: 'To take an exam', createdAt: new Date() },
  { id: 'demo-n4-09', level: 'N4', kanji: '決める', hiragana: 'きめる', romaji: 'kimeru', meaningId: 'memutuskan', meaningEn: 'to decide', exampleJp: '日程を決める', exampleId: 'Memutuskan jadwal', exampleEn: 'To decide on a schedule', createdAt: new Date() },
  { id: 'demo-n4-10', level: 'N4', kanji: '集める', hiragana: 'あつめる', romaji: 'atsumeru', meaningId: 'mengumpulkan', meaningEn: 'to collect / to gather', exampleJp: '情報を集める', exampleId: 'Mengumpulkan informasi', exampleEn: 'To gather information', createdAt: new Date() },
  { id: 'demo-n4-11', level: 'N4', kanji: '並ぶ', hiragana: 'ならぶ', romaji: 'narabu', meaningId: 'berbaris / mengantri', meaningEn: 'to line up / to queue', exampleJp: '列に並ぶ', exampleId: 'Mengantri di barisan', exampleEn: 'To stand in a line', createdAt: new Date() },
  { id: 'demo-n4-12', level: 'N4', kanji: '続ける', hiragana: 'つづける', romaji: 'tsuzukeru', meaningId: 'melanjutkan', meaningEn: 'to continue', exampleJp: '勉強を続ける', exampleId: 'Melanjutkan belajar', exampleEn: 'To continue studying', createdAt: new Date() },
  { id: 'demo-n4-13', level: 'N4', kanji: '変わる', hiragana: 'かわる', romaji: 'kawaru', meaningId: 'berubah', meaningEn: 'to change', exampleJp: '天気が変わる', exampleId: 'Cuaca berubah', exampleEn: 'The weather changes', createdAt: new Date() },
  { id: 'demo-n4-14', level: 'N4', kanji: '急ぐ', hiragana: 'いそぐ', romaji: 'isogu', meaningId: 'terburu-buru', meaningEn: 'to hurry', exampleJp: '駅まで急ぐ', exampleId: 'Terburu-buru ke stasiun', exampleEn: 'To hurry to the station', createdAt: new Date() },
  { id: 'demo-n4-15', level: 'N4', kanji: '働く', hiragana: 'はたらく', romaji: 'hataraku', meaningId: 'bekerja', meaningEn: 'to work', exampleJp: '会社で働く', exampleId: 'Bekerja di perusahaan', exampleEn: 'To work at a company', createdAt: new Date() },
  { id: 'demo-n4-16', level: 'N4', kanji: '運ぶ', hiragana: 'はこぶ', romaji: 'hakobu', meaningId: 'membawa / mengangkut', meaningEn: 'to carry / to transport', exampleJp: '荷物を運ぶ', exampleId: 'Membawa bagasi', exampleEn: 'To carry luggage', createdAt: new Date() },
  { id: 'demo-n4-17', level: 'N4', kanji: '伝える', hiragana: 'つたえる', romaji: 'tsutaeru', meaningId: 'menyampaikan', meaningEn: 'to convey / to tell', exampleJp: 'メッセージを伝える', exampleId: 'Menyampaikan pesan', exampleEn: 'To convey a message', createdAt: new Date() },
  { id: 'demo-n4-18', level: 'N4', kanji: '調べる', hiragana: 'しらべる', romaji: 'shiraberu', meaningId: 'memeriksa / menyelidiki', meaningEn: 'to investigate / to check', exampleJp: '辞書で調べる', exampleId: 'Mencari di kamus', exampleEn: 'To look up in a dictionary', createdAt: new Date() },
];

/** Get demo cards for a given level, shuffled */
export function getDemoCards(level: 'N5' | 'N4', count = 20): Flashcard[] {
  const pool = level === 'N5' ? DEMO_CARDS_N5 : DEMO_CARDS_N4;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Check if app is running in demo mode (no DB configured) */
export function isDemoMode(): boolean {
  return !process.env['DATABASE_URL'] || !process.env['NEXT_PUBLIC_SUPABASE_URL'];
}

export const DEMO_SESSIONS: StudySession[] = [];
