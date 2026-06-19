const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  console.log('🔄 Initializing database...');

  // Create database if not exists
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'jesusgift_db'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE ${process.env.DB_NAME || 'jesusgift_db'}`);

  // Users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) DEFAULT '',
      avatar VARCHAR(255) DEFAULT '',
      language VARCHAR(10) DEFAULT 'zh',
      is_admin BOOLEAN DEFAULT FALSE,
      is_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255) DEFAULT '',
      reset_token VARCHAR(255) DEFAULT '',
      reset_token_expires DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Users table created');

  // Gifts table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      gift_key VARCHAR(50) NOT NULL UNIQUE,
      title_zh VARCHAR(100) NOT NULL,
      title_en VARCHAR(100) NOT NULL,
      title_fr VARCHAR(100) NOT NULL,
      title_de VARCHAR(100) NOT NULL,
      title_ru VARCHAR(100) NOT NULL,
      title_ja VARCHAR(100) NOT NULL,
      description_zh TEXT,
      description_en TEXT,
      description_fr TEXT,
      description_de TEXT,
      description_ru TEXT,
      description_ja TEXT,
      icon VARCHAR(50) DEFAULT 'heart',
      category VARCHAR(50) DEFAULT 'blessing',
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Gifts table created');

  // Blessings (verses) table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS blessings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      verse_key VARCHAR(50) NOT NULL UNIQUE,
      text_zh TEXT NOT NULL,
      text_en TEXT NOT NULL,
      text_fr TEXT NOT NULL,
      text_de TEXT NOT NULL,
      text_ru TEXT NOT NULL,
      text_ja TEXT NOT NULL,
      reference_zh VARCHAR(100) NOT NULL,
      reference_en VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Blessings table created');

  // Gift shares table (tracking user gift sharing)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS gift_shares (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      gift_id INT NOT NULL,
      blessing_id INT DEFAULT NULL,
      from_name VARCHAR(100) DEFAULT '',
      to_name VARCHAR(100) DEFAULT '',
      custom_blessing TEXT DEFAULT NULL,
      share_method VARCHAR(20) DEFAULT 'download',
      share_link VARCHAR(255) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE CASCADE,
      FOREIGN KEY (blessing_id) REFERENCES blessings(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ Gift shares table created');

  // Insert default gifts
  const defaultGifts = [
    ['anxiety', '职场焦虑卡', 'Work Anxiety Card', 'Carte Anxiété', 'Arbeitsstress-Karte', 'Карта тревоги', '仕事の不安カード', '在忙碌中找回平安', 'Find Peace in Busyness', 'Retrouver la paix', 'Frieden finden', 'Найдите покой', '平安を見つける', 'heart', 'blessing', 1],
    ['loneliness', '深夜孤独卡', 'Late Night Loneliness Card', 'Carte Solitude', 'Einsamkeits-Karte', 'Карта одиночества', '深夜の孤独カード', '你并不孤单', 'You Are Not Alone', 'Vous n\'êtes pas seul', 'Du bist nicht allein', 'Вы не одни', '一人ではない', 'moon', 'blessing', 2],
    ['gratitude', '感恩祝福卡', 'Gratitude Card', 'Carte Gratitude', 'Dankbarkeits-Karte', 'Карта благодарности', '感謝カード', '凡事谢恩', 'Give Thanks in All Things', 'Rendez grâce', 'Danke sagen', 'Благодарите', '感謝する', 'sun', 'blessing', 3],
    ['healing', '失恋疗愈卡', 'Heartbreak Healing Card', 'Carte Guérison', 'Heilungs-Karte', 'Карта исцеления', '失恋の癒しカード', '祂在伤口处', 'He Is Near', 'Il est proche', 'Er ist nahe', 'Он близок', '神はそばにいる', 'heart', 'blessing', 4],
    ['exam', '考试加油卡', 'Exam Encouragement Card', 'Carte Examens', 'Prüfungs-Karte', 'Карта экзаменов', '試験応援カード', '仰望中得力量', 'Find Strength', 'Trouver la force', 'Kraft finden', 'Найдите силу', '力を得る', 'badge', 'blessing', 5],
    ['birthday', '生日祝福卡', 'Birthday Blessing Card', 'Carte Anniversaire', 'Geburtstags-Karte', 'Карта день рождения', '誕生日祝福カード', '生命的恩典', 'Grace of Life', 'Grâce de la vie', 'Gnade des Lebens', 'Благодать жизни', '命の恵み', 'cake', 'blessing', 6]
  ];

  for (const gift of defaultGifts) {
    await connection.query(`
      INSERT IGNORE INTO gifts (gift_key, title_zh, title_en, title_fr, title_de, title_ru, title_ja, description_zh, description_en, description_fr, description_de, description_ru, description_ja, icon, category, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, gift);
  }
  console.log('✅ Default gifts inserted');

  // Insert default blessings (verses)
  const defaultBlessings = [
    ['john14_1', '"你们心里不要忧愁，你们信神，也当信我。"', '"Do not let your hearts be troubled. You believe in God; believe also in me."', '"Que votre cœur ne se trouble pas. Vous croyez en Dieu, croyez aussi en moi."', '"Euer Herz werde nicht verzagt. Glaubt an Gott und glaubt an mich!"', '"Да не смущается сердце ваше; веруйте в Бога и в Меня веруйте."', '"心を騒がせるな。神を信じるのであるから、わたしをも信じよ。"', '约翰福音 14:1', 'John 14:1'],
    ['phil4_6', '"应当一无挂虑，只要凡事借着祷告、祈求和感谢，将你们所要的告诉神。"', '"Do not be anxious about anything, but in every situation present your requests to God."', '"Ne vous inquiétez de rien, mais en toute chose faites connaître vos besoins à Dieu."', '"Sorgt euch um nichts, sondern bringt in jeder Lage eure Bitten vor Gott."', '"Не заботьтесь ни о чем, но во всем молитвой открывайте свои желания пред Богом."', '"何事も思い煩わず、感謝をもって祈りと願いとによって、神に知らせなさい。"', '腓立比书 4:6', 'Philippians 4:6'],
    ['psalm23', '"耶和华是我的牧者，我必不致缺乏。"', '"The Lord is my shepherd, I lack nothing."', '"L\'Éternel est mon berger: je ne manquerai de rien."', '"Der Herr ist mein Hirte, mir wird nichts mangeln."', '"Господь пастырь мой; я ни в чем не буду нуждаться."', '"主はわが牧者。わたしは乏しいことがない。"', '诗篇 23:1', 'Psalm 23:1'],
    ['psalm46_10', '"你们要休息，要知道我是神！"', '"Be still, and know that I am God."', '"Cessez, et sachez que je suis Dieu."', '"Seid still und erkennt, dass ich Gott bin."', '"Остановитесь и познайте, что Я Бог."', '"静まれ、わたしが神であることを知れ。"', '诗篇 46:10', 'Psalm 46:10'],
    ['matt11_28', '"凡劳苦担重担的人，可以到我这里来，我就使你们得安息。"', '"Come to me, all you who are weary and burdened, and I will give you rest."', '"Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos."', '"Kommt her zu mir, alle, die ihr mühselig und belastet seid."', '"Придите ко Мне, все трудящиеся и обремененные, и Я успокою вас."', '"疲れて重荷を負う者よ、みなわたしのもとに来なさい。"', '马太福音 11:28', 'Matthew 11:28'],
    ['isaiah41_10', '"不要惧怕，因为我与你同在。"', '"So do not fear, for I am with you."', '"Ne crains pas, car je suis avec toi."', '"Fürchte dich nicht, denn ich bin mit dir."', '"Не бойся, ибо Я с тобою."', '"恐れるな。わたしは共にいる。"', '以赛亚书 41:10', 'Isaiah 41:10'],
    ['rom8_28', '"万事都互相效力，叫爱神的人得益处。"', '"And we know that in all things God works for the good of those who love him."', '"Nous savons que toutes choses concourent au bien de ceux qui aiment Dieu."', '"Wir wissen aber, dass denen, die Gott lieben, alle Dinge zum Besten dienen."', '"Мы знаем, что любящим Бога все содействует ко благу."', '"神を愛する者のために、万事が益となるように働くことを、わたしたちは知っている。"', '罗马书 8:28', 'Romans 8:28']
  ];

  for (const blessing of defaultBlessings) {
    await connection.query(`
      INSERT IGNORE INTO blessings (verse_key, text_zh, text_en, text_fr, text_de, text_ru, text_ja, reference_zh, reference_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, blessing);
  }
  console.log('✅ Default blessings inserted');

  // Create default admin user
  const bcrypt = require('bcryptjs');
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await connection.query(`
    INSERT IGNORE INTO users (email, password, name, is_admin, is_verified, language)
    VALUES (?, ?, 'Admin', TRUE, TRUE, 'zh')
  `, [process.env.ADMIN_EMAIL || 'admin@jesusgift.org', adminPassword]);
  console.log('✅ Default admin user created');

  await connection.end();
  console.log('🎉 Database initialization completed!');
}

initDatabase().catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});