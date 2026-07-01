import type { ThaiRegion } from "@/lib/network-data";

/**
 * Maps each of Thailand's 77 provinces (both Thai and English names) to one
 * of the six regions used by the Royal Institute of Thailand classification.
 *
 * The classification matches what TMD and most Thai government bodies use
 * for regional reporting, so dashboard region labels stay consistent with
 * what an operator would expect to see.
 *
 * GeoJSON sources tend to label provinces in different ways (e.g. "Bangkok"
 * vs "Krung Thep Maha Nakhon", "Phra Nakhon Si Ayutthaya" vs "Ayutthaya"),
 * so we list every variant we've observed in upstream data.
 */
export const PROVINCE_TO_REGION: Record<string, ThaiRegion> = {
  // ─── ภาคเหนือ (Northern) — 9 provinces ───────────────────────────────────
  "เชียงใหม่": "north", "Chiang Mai": "north",
  "เชียงราย": "north", "Chiang Rai": "north",
  "ลำพูน": "north", "Lamphun": "north",
  "ลำปาง": "north", "Lampang": "north",
  "แม่ฮ่องสอน": "north", "Mae Hong Son": "north",
  "น่าน": "north", "Nan": "north",
  "พะเยา": "north", "Phayao": "north",
  "แพร่": "north", "Phrae": "north",
  "อุตรดิตถ์": "north", "Uttaradit": "north",

  // ─── ภาคอีสาน (Northeastern) — 20 provinces ──────────────────────────────
  "อำนาจเจริญ": "northeast", "Amnat Charoen": "northeast",
  "บึงกาฬ": "northeast", "Bueng Kan": "northeast",
  "บุรีรัมย์": "northeast", "Buri Ram": "northeast", "Buriram": "northeast",
  "ชัยภูมิ": "northeast", "Chaiyaphum": "northeast",
  "กาฬสินธุ์": "northeast", "Kalasin": "northeast",
  "ขอนแก่น": "northeast", "Khon Kaen": "northeast",
  "เลย": "northeast", "Loei": "northeast",
  "มหาสารคาม": "northeast", "Maha Sarakham": "northeast",
  "มุกดาหาร": "northeast", "Mukdahan": "northeast",
  "นครพนม": "northeast", "Nakhon Phanom": "northeast",
  "นครราชสีมา": "northeast", "Nakhon Ratchasima": "northeast",
  "หนองบัวลำภู": "northeast", "Nong Bua Lam Phu": "northeast", "Nong Bua Lamphu": "northeast",
  "หนองคาย": "northeast", "Nong Khai": "northeast",
  "ร้อยเอ็ด": "northeast", "Roi Et": "northeast",
  "สกลนคร": "northeast", "Sakon Nakhon": "northeast",
  "ศรีสะเกษ": "northeast", "Si Sa Ket": "northeast", "Sisaket": "northeast",
  "สุรินทร์": "northeast", "Surin": "northeast",
  "อุบลราชธานี": "northeast", "Ubon Ratchathani": "northeast",
  "อุดรธานี": "northeast", "Udon Thani": "northeast",
  "ยโสธร": "northeast", "Yasothon": "northeast",

  // ─── ภาคกลาง (Central) — 21 provinces incl. Bangkok ──────────────────────
  "อ่างทอง": "central", "Ang Thong": "central",
  "กรุงเทพมหานคร": "central", "Bangkok": "central", "Krung Thep Maha Nakhon": "central",
  "ชัยนาท": "central", "Chai Nat": "central",
  "กำแพงเพชร": "central", "Kamphaeng Phet": "central",
  "ลพบุรี": "central", "Lop Buri": "central", "Lopburi": "central",
  "นครนายก": "central", "Nakhon Nayok": "central",
  "นครปฐม": "central", "Nakhon Pathom": "central",
  "นครสวรรค์": "central", "Nakhon Sawan": "central",
  "นนทบุรี": "central", "Nonthaburi": "central",
  "ปทุมธานี": "central", "Pathum Thani": "central",
  "พิจิตร": "central", "Phichit": "central",
  "พิษณุโลก": "central", "Phitsanulok": "central",
  "พระนครศรีอยุธยา": "central", "Phra Nakhon Si Ayutthaya": "central", "Ayutthaya": "central",
  "เพชรบูรณ์": "central", "Phetchabun": "central",
  "สมุทรปราการ": "central", "Samut Prakan": "central",
  "สมุทรสาคร": "central", "Samut Sakhon": "central",
  "สมุทรสงคราม": "central", "Samut Songkhram": "central",
  "สระบุรี": "central", "Saraburi": "central",
  "สิงห์บุรี": "central", "Sing Buri": "central", "Singburi": "central",
  "สุโขทัย": "central", "Sukhothai": "central",
  "สุพรรณบุรี": "central", "Suphan Buri": "central", "Suphanburi": "central",
  "อุทัยธานี": "central", "Uthai Thani": "central",

  // ─── ภาคตะวันออก (Eastern) — 7 provinces ──────────────────────────────────
  "ฉะเชิงเทรา": "east", "Chachoengsao": "east",
  "จันทบุรี": "east", "Chanthaburi": "east",
  "ชลบุรี": "east", "Chon Buri": "east", "Chonburi": "east",
  "ปราจีนบุรี": "east", "Prachin Buri": "east", "Prachinburi": "east",
  "ระยอง": "east", "Rayong": "east",
  "สระแก้ว": "east", "Sa Kaeo": "east", "Sakaeo": "east",
  "ตราด": "east", "Trat": "east",

  // ─── ภาคตะวันตก (Western) — 5 provinces ───────────────────────────────────
  "กาญจนบุรี": "west", "Kanchanaburi": "west",
  "เพชรบุรี": "west", "Phetchaburi": "west",
  "ประจวบคีรีขันธ์": "west", "Prachuap Khiri Khan": "west",
  "ราชบุรี": "west", "Ratchaburi": "west",
  "ตาก": "west", "Tak": "west",

  // ─── ภาคใต้ (Southern) — 14 provinces ─────────────────────────────────────
  "กระบี่": "south", "Krabi": "south",
  "ชุมพร": "south", "Chumphon": "south",
  "นครศรีธรรมราช": "south", "Nakhon Si Thammarat": "south",
  "นราธิวาส": "south", "Narathiwat": "south",
  "ปัตตานี": "south", "Pattani": "south",
  "พังงา": "south", "Phang Nga": "south",
  "พัทลุง": "south", "Phatthalung": "south",
  "ภูเก็ต": "south", "Phuket": "south",
  "ระนอง": "south", "Ranong": "south",
  "สตูล": "south", "Satun": "south",
  "สงขลา": "south", "Songkhla": "south",
  "สุราษฎร์ธานี": "south", "Surat Thani": "south",
  "ตรัง": "south", "Trang": "south",
  "ยะลา": "south", "Yala": "south",
};

/**
 * Common property keys that hold a province's name in different GeoJSON
 * sources. We check each in order and stop on the first match — saves
 * callers from probing the schema manually.
 */
export const PROVINCE_NAME_KEYS = [
  "NAME_1",      // GADM
  "name",
  "NL_NAME_1",   // GADM Thai name
  "province",
  "PROVINCE",
  "ADM1_TH",
  "ADM1_EN",
  "shapeName",   // geoBoundaries
];

export function getProvinceRegion(
  properties: Record<string, unknown> | undefined | null,
): ThaiRegion | null {
  if (!properties) return null;
  for (const key of PROVINCE_NAME_KEYS) {
    const v = properties[key];
    if (typeof v === "string") {
      const region = PROVINCE_TO_REGION[v.trim()];
      if (region) return region;
    }
  }
  return null;
}
