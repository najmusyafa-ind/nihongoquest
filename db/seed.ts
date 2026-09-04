// db/seed.ts — Seed 20 N5 flashcards into the database
// Run with: npx tsx db/seed.ts

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { flashcards } from './schema';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

const n5Cards = [
  { level: 'N5' as const, kanji: '食べる', hiragana: 'たべる', romaji: 'taberu', meaningId: 'makan', meaningEn: 'to eat', exampleJp: '私はご飯を食べる', exampleId: 'Saya makan nasi', exampleEn: 'I eat rice' },
  { level: 'N5' as const, kanji: '飲む', hiragana: 'のむ', romaji: 'nomu', meaningId: 'minum', meaningEn: 'to drink', exampleJp: '水を飲む', exampleId: 'Minum air', exampleEn: 'To drink water' },
  { level: 'N5' as const, kanji: '見る', hiragana: 'みる', romaji: 'miru', meaningId: 'melihat', meaningEn: 'to see / to watch', exampleJp: '映画を見る', exampleId: 'Menonton film', exampleEn: 'To watch a movie' },
  { level: 'N5' as const, kanji: '聞く', hiragana: 'きく', romaji: 'kiku', meaningId: 'mendengar', meaningEn: 'to listen / to hear', exampleJp: '音楽を聞く', exampleId: 'Mendengarkan musik', exampleEn: 'To listen to music' },
  { level: 'N5' as const, kanji: '行く', hiragana: 'いく', romaji: 'iku', meaningId: 'pergi', meaningEn: 'to go', exampleJp: '学校に行く', exampleId: 'Pergi ke sekolah', exampleEn: 'To go to school' },
  { level: 'N5' as const, kanji: '来る', hiragana: 'くる', romaji: 'kuru', meaningId: 'datang', meaningEn: 'to come', exampleJp: '友達が来る', exampleId: 'Teman datang', exampleEn: 'A friend comes' },
  { level: 'N5' as const, kanji: null, hiragana: 'する', romaji: 'suru', meaningId: 'melakukan', meaningEn: 'to do', exampleJp: '勉強する', exampleId: 'Belajar', exampleEn: 'To study' },
  { level: 'N5' as const, kanji: '話す', hiragana: 'はなす', romaji: 'hanasu', meaningId: 'berbicara', meaningEn: 'to speak', exampleJp: '日本語を話す', exampleId: 'Berbicara bahasa Jepang', exampleEn: 'To speak Japanese' },
  { level: 'N5' as const, kanji: '読む', hiragana: 'よむ', romaji: 'yomu', meaningId: 'membaca', meaningEn: 'to read', exampleJp: '本を読む', exampleId: 'Membaca buku', exampleEn: 'To read a book' },
  { level: 'N5' as const, kanji: '書く', hiragana: 'かく', romaji: 'kaku', meaningId: 'menulis', meaningEn: 'to write', exampleJp: '手紙を書く', exampleId: 'Menulis surat', exampleEn: 'To write a letter' },
  { level: 'N5' as const, kanji: '買う', hiragana: 'かう', romaji: 'kau', meaningId: 'membeli', meaningEn: 'to buy', exampleJp: 'りんごを買う', exampleId: 'Membeli apel', exampleEn: 'To buy an apple' },
  { level: 'N5' as const, kanji: '売る', hiragana: 'うる', romaji: 'uru', meaningId: 'menjual', meaningEn: 'to sell', exampleJp: '車を売る', exampleId: 'Menjual mobil', exampleEn: 'To sell a car' },
  { level: 'N5' as const, kanji: '大きい', hiragana: 'おおきい', romaji: 'ookii', meaningId: 'besar', meaningEn: 'big / large', exampleJp: '大きい犬', exampleId: 'Anjing besar', exampleEn: 'A big dog' },
  { level: 'N5' as const, kanji: '小さい', hiragana: 'ちいさい', romaji: 'chiisai', meaningId: 'kecil', meaningEn: 'small / little', exampleJp: '小さい猫', exampleId: 'Kucing kecil', exampleEn: 'A small cat' },
  { level: 'N5' as const, kanji: '新しい', hiragana: 'あたらしい', romaji: 'atarashii', meaningId: 'baru', meaningEn: 'new', exampleJp: '新しい本', exampleId: 'Buku baru', exampleEn: 'A new book' },
  { level: 'N5' as const, kanji: '古い', hiragana: 'ふるい', romaji: 'furui', meaningId: 'lama / tua', meaningEn: 'old', exampleJp: '古い家', exampleId: 'Rumah tua', exampleEn: 'An old house' },
  { level: 'N5' as const, kanji: '高い', hiragana: 'たかい', romaji: 'takai', meaningId: 'mahal / tinggi', meaningEn: 'expensive / tall', exampleJp: '高いビル', exampleId: 'Gedung tinggi', exampleEn: 'A tall building' },
  { level: 'N5' as const, kanji: '安い', hiragana: 'やすい', romaji: 'yasui', meaningId: 'murah', meaningEn: 'cheap / inexpensive', exampleJp: '安い服', exampleId: 'Baju murah', exampleEn: 'Cheap clothes' },
  { level: 'N5' as const, kanji: '面白い', hiragana: 'おもしろい', romaji: 'omoshiroi', meaningId: 'menarik / lucu', meaningEn: 'interesting / funny', exampleJp: '面白い映画', exampleId: 'Film yang menarik', exampleEn: 'An interesting movie' },
  { level: 'N5' as const, kanji: '難しい', hiragana: 'むずかしい', romaji: 'muzukashii', meaningId: 'sulit', meaningEn: 'difficult', exampleJp: '難しい問題', exampleId: 'Soal yang sulit', exampleEn: 'A difficult question' },
];

async function seed() {
  console.log('🌱 Seeding N5 flashcards...');
  
  await db.insert(flashcards)
    .values(n5Cards)
    .onConflictDoNothing();

  console.log(`✅ Seeded ${n5Cards.length} N5 flashcards`);
  await client.end();
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
