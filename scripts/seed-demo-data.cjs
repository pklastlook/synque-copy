/**
 * Comprehensive seed script for the social_media_cell tenant database.
 * Creates demo team members + dummy content across ALL modules.
 *
 * Usage: node scripts/seed-demo-data.cjs
 */
const { Client } = require('/home/z/my-project/node_modules/pg');
const bcrypt = require('/home/z/my-project/node_modules/bcryptjs');

const TENANT_DB = 'postgresql://neondb_owner:npg_qfWy1z2OiKEM@ep-spring-darkness-auk3ozf9-pooler.c-10.us-east-1.aws.neon.tech/social_media_cell?sslmode=require';
const MAIN_DB = 'postgresql://neondb_owner:npg_qfWy1z2OiKEM@ep-spring-darkness-auk3ozf9-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require';
const CUSTOMER_ID = 'cmuw6ixge000104k1dh1af2bi';

const PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'threads'];
const NAMES = [
  { name: 'Admin Manager', email: 'admin@smc.demo', role: 'admin', color: 'blue', title: 'Administrator', dept: 'Management' },
  { name: 'Sarah Khan', email: 'sarah@smc.demo', role: 'manager', color: 'rose', title: 'Content Manager', dept: 'Content' },
  { name: 'Ahmed Ali', email: 'ahmed@smc.demo', role: 'editor', color: 'teal', title: 'Social Media Editor', dept: 'Content' },
  { name: 'Fatima Zahra', email: 'fatima@smc.demo', role: 'editor', color: 'magenta', title: 'Video Editor', dept: 'Content' },
  { name: 'Bilal Ahmed', email: 'bilal@smc.demo', role: 'member', color: 'green', title: 'Community Manager', dept: 'Community' },
  { name: 'Zainab Malik', email: 'zainab@smc.demo', role: 'viewer', color: 'amber', title: 'Analytics Viewer', dept: 'Insights' },
];

const POST_TITLES = [
  'New Product Launch — Aurora Collection', 'Behind the Scenes: Studio Photoshoot',
  'Customer Spotlight: Success Story', 'Weekly Industry Roundup',
  'How-To Guide: 5 Tips for Better Content', 'Brand Collaboration Announcement',
  'Holiday Special: Limited Edition', 'Team Spotlight: Meet Our Designers',
  'Q&A Session: Ask Us Anything', 'Flash Sale: 24 Hours Only',
  'Sustainability Report 2026', 'Community Challenge: Share Your Story',
  'Product Tutorial: Getting Started', 'Industry Trends: What\'s Hot This Month',
  'Throwback Thursday: Our Journey', 'Webinar Announcement: Growth Strategies',
  'User-Generated Content Feature', 'Behind the Brand: Our Mission',
  'Seasonal Campaign: Spring Collection', 'Milestone: 100K Followers Celebration',
];

const COMMENT_TEXTS = [
  { text: 'Love this content! So inspiring.', sentiment: 'positive', author: 'Maya Chen' },
  { text: 'Where can I buy this product?', sentiment: 'neutral', author: 'John Smith' },
  { text: 'Amazing quality, just ordered mine!', sentiment: 'positive', author: 'Emily Davis' },
  { text: 'This is not working for me, need help.', sentiment: 'negative', author: 'Mike Brown' },
  { text: 'Can\'t wait for the next drop!', sentiment: 'positive', author: 'Lisa Wang' },
  { text: 'Stop posting the same content.', sentiment: 'negative', author: 'hater_99' },
  { text: 'Your tutorials are the best, thank you!', sentiment: 'positive', author: 'David Lee' },
  { text: 'What sizes are available?', sentiment: 'neutral', author: 'Anna Garcia' },
  { text: 'Just shared this with my team, great insights!', sentiment: 'positive', author: 'Robert Kim' },
  { text: 'Disappointed with the shipping time.', sentiment: 'negative', author: 'Tom Wilson' },
  { text: 'This is exactly what I needed today.', sentiment: 'positive', author: 'Sophie Martin' },
  { text: 'Do you ship internationally?', sentiment: 'neutral', author: 'Yuki Tanaka' },
  { text: 'The quality is outstanding!', sentiment: 'positive', author: 'Carlos Rivera' },
  { text: 'Following since day one, keep it up!', sentiment: 'positive', author: 'Maria Lopez' },
  { text: 'Can you do a tutorial on this?', sentiment: 'neutral', author: 'Alex Turner' },
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (days) => new Date(Date.now() - days * 86400000);
const hoursAgo = (h) => new Date(Date.now() - h * 3600000);

async function main() {
  const tenant = new Client({ connectionString: TENANT_DB });
  const mainDb = new Client({ connectionString: MAIN_DB });
  await tenant.connect();
  await mainDb.connect();
  console.log('Connected to both databases.\n');

  // === 1. Create demo users ===
  console.log('=== Creating demo team members ===');
  const hashedPassword = await bcrypt.hash('Demo@2026', 12);
  const userIds = [];
  for (const u of NAMES) {
    // Check if user already exists in main DB
    const existing = await mainDb.query('SELECT id FROM "User" WHERE email = $1', [u.email]);
    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      console.log(`  → ${u.name} (${u.role}) — already exists`);
    } else {
      userId = 'demo_' + Math.random().toString(36).slice(2, 12);
      await mainDb.query(
        `INSERT INTO "User" (id, name, email, password, role, title, department, color, permissions, status, "customerId", "emailVerified", "lastActive", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,NOW(),NOW(),NOW())`,
        [userId, u.name, u.email, hashedPassword, u.role, u.title, u.dept, u.color, JSON.stringify(["*"]), CUSTOMER_ID]
      );
      console.log(`  ✓ ${u.name} (${u.role}) — created`);
    }
    // Check/insert in tenant DB
    const existingT = await tenant.query('SELECT id FROM "User" WHERE email = $1', [u.email]);
    if (existingT.rows.length === 0) {
      await tenant.query(
        `INSERT INTO "User" (id, name, email, password, role, title, department, color, permissions, status, "customerId", "emailVerified", "lastActive", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,NOW(),NOW(),NOW())`,
        [userId, u.name, u.email, hashedPassword, u.role, u.title, u.dept, u.color, JSON.stringify(["*"]), CUSTOMER_ID]
      );
    } else {
      userId = existingT.rows[0].id;
    }
    userIds.push({ id: userId, ...u });
  }

  // === 2. Create accounts ===
  console.log('\n=== Creating social media accounts ===');
  const accountIds = [];
  const accountData = [
    { platform: 'instagram', handle: '@synque.official', name: 'SYNQUE Official', followers: 45200 },
    { platform: 'facebook', handle: 'SYNQUE Page', name: 'SYNQUE', followers: 28100 },
    { platform: 'x', handle: '@synque', name: 'SYNQUE', followers: 18900 },
    { platform: 'linkedin', handle: 'SYNQUE Inc.', name: 'SYNQUE Inc.', followers: 12500 },
    { platform: 'tiktok', handle: '@synque', name: 'SYNQUE', followers: 67800 },
    { platform: 'youtube', handle: 'SYNQUE Channel', name: 'SYNQUE Channel', followers: 8400 },
    { platform: 'threads', handle: '@synque', name: 'SYNQUE', followers: 5200 },
  ];
  const adminId = userIds[0].id;
  for (const a of accountData) {
    const accId = 'acc_' + Math.random().toString(36).slice(2, 12);
    accountIds.push({ id: accId, platform: a.platform });
    await tenant.query(`INSERT INTO "Account" (id,platform,handle,"displayName",followers,"postsCount",verified,"ownerId","customerId","createdAt") VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,NOW())`,[accId,a.platform,a.handle,a.name,a.followers,['instagram','linkedin'].includes(a.platform),adminId,CUSTOMER_ID]);
    await tenant.query(`INSERT INTO "AccountHealth" (id,"accountId","riskScore","riskLevel",status,"riskReasons","lastUpdated","updatedAt") VALUES ($1,$2,$3,$4,$5,'[]',NOW(),NOW())`,['ah_'+Math.random().toString(36).slice(2,12),accId,randomInt(2,8),randomFrom(['safe','safe','warning']),'healthy']);
    await tenant.query(`INSERT INTO "AccountProtection" (id,"accountId",enabled,"createdAt","updatedAt") VALUES ($1,$2,true,NOW(),NOW())`,['ap_'+Math.random().toString(36).slice(2,12),accId]);
    console.log(`  ✓ ${a.platform} — ${a.handle} (${a.followers} followers)`);
  }

  // === 3. Create posts + variants ===
  console.log('\n=== Creating posts ===');
  for (let i = 0; i < POST_TITLES.length; i++) {
    const postId = 'post_' + Math.random().toString(36).slice(2, 12);
    const author = randomFrom(userIds);
    const status = randomFrom(['published','published','published','scheduled','draft']);
    const createdAt = daysAgo(randomInt(1, 30));
    const mediaType = randomFrom(['image','image','image','video','none']);
    const mediaUrl = mediaType !== 'none' ? `https://images.unsplash.com/photo-${randomFrom(['1551434678-e076c223a692','1522071820081-009f0129c71c','1611162617474-5b21e879e113','1591115765373-5207764f72e7'])}?w=800` : null;
    await tenant.query(`INSERT INTO "Post" (id,title,caption,"mediaUrl","mediaType",tone,status,"authorId","customerId","createdAt","updatedAt","scheduledAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11)`,[postId,POST_TITLES[i],`Caption for ${POST_TITLES[i]}. Demo content. #synque`,mediaUrl,mediaType,'professional',status,author.id,CUSTOMER_ID,createdAt,status==='scheduled'?hoursAgo(-24):null]);
    const variantCount = randomInt(1, 3);
    const selected = [...accountIds].sort(() => Math.random() - 0.5).slice(0, variantCount);
    for (const acc of selected) {
      const likes = status === 'published' ? randomInt(50, 5000) : 0;
      await tenant.query(`INSERT INTO "PostVariant" (id,"postId","accountId",content,hashtags,status,"publishedAt",likes,comments,shares,reach,impressions,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,['var_'+Math.random().toString(36).slice(2,12),postId,acc.id,`Content for ${acc.platform}`,'#demo,#synque',status,status==='published'?createdAt:null,likes,randomInt(5,300),randomInt(10,800),randomInt(1000,50000),randomInt(2000,100000),createdAt]);
    }
    console.log(`  ✓ ${POST_TITLES[i]} (${status})`);
  }

  // === 4. Create comments ===
  console.log('\n=== Creating inbox comments ===');
  for (const c of COMMENT_TEXTS) {
    const acc = randomFrom(accountIds);
    await tenant.query(`INSERT INTO "Comment" (id,"accountId",author,"authorAvatar",text,type,sentiment,replied,"createdAt","customerId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,['cmt_'+Math.random().toString(36).slice(2,12),acc.id,c.author,`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.author)}`,c.text,'comment',c.sentiment,Math.random()>0.6,daysAgo(randomInt(1,14)),CUSTOMER_ID]);
  }
  console.log(`  ✓ ${COMMENT_TEXTS.length} comments created`);

  // === 5. Create media assets ===
  console.log('\n=== Creating media assets ===');
  for (const name of ['Product Hero.png','Team Photo.jpg','Campaign Video.mp4','Logo.png','Banner.jpg','Tutorial.mp4']) {
    const type = name.endsWith('.mp4') ? 'video' : 'image';
    await tenant.query(`INSERT INTO "MediaAsset" (id,name,type,url,thumbnail,size,width,height,tags,folder,"uploadedById","customerId","createdAt") VALUES ($1,$2,$3,$4,$5,$6,1920,1080,'demo','root',$7,$8,NOW())`,['med_'+Math.random().toString(36).slice(2,12),name,type,`https://images.unsplash.com/photo-1551434678-e076c223a692?w=800`,`https://images.unsplash.com/photo-1551434678-e076c223a692?w=400`,randomInt(500000,5000000),adminId,CUSTOMER_ID]);
    console.log(`  ✓ ${name}`);
  }

  // === 6. Create analytics ===
  console.log('\n=== Creating analytics (15 days) ===');
  for (const acc of accountIds) {
    let followers = randomInt(5000, 60000);
    for (let d = 14; d >= 0; d--) {
      followers += randomInt(50, 500);
      await tenant.query(`INSERT INTO "AnalyticsDaily" (id,"accountId",date,followers,impressions,reach,engagement,posts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,['an_'+Math.random().toString(36).slice(2,12),acc.id,daysAgo(d),followers,randomInt(10000,100000),randomInt(5000,50000),randomInt(100,2000),randomInt(1,5)]);
    }
  }
  console.log(`  ✓ ${accountIds.length * 15} analytics rows`);

  // === 7. Create tasks ===
  console.log('\n=== Creating tasks ===');
  for (const title of ['Review Q4 content calendar','Approve influencer collaboration','Create holiday campaign brief','Update bio links','Schedule weekly posts','Respond to urgent comments','Prepare analytics report','Design new post templates','Research competitor strategy','Plan Instagram Live session']) {
    const assignee = randomFrom(userIds);
    await tenant.query(`INSERT INTO "Task" (id,title,description,status,priority,"assigneeId","creatorId","customerId","dueAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,['task_'+Math.random().toString(36).slice(2,12),title,`Demo: ${title}`,randomFrom(['todo','in_progress','done','done']),randomFrom(['high','medium','low']),assignee.id,adminId,CUSTOMER_ID,daysAgo(-randomInt(1,14))]);
  }
  console.log(`  ✓ 10 tasks created`);

  // === 8. Create campaigns ===
  console.log('\n=== Creating campaigns ===');
  for (const c of [{n:'Q4 Product Launch',s:'active',b:5000},{n:'Holiday Special 2026',s:'scheduled',b:3000},{n:'Brand Awareness Q3',s:'completed',b:2000}]) {
    await tenant.query(`INSERT INTO "Campaign" (id,name,status,budget,"startDate","endDate","ownerId","customerId","createdAt","updatedAt","color") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),$9)`,['camp_'+Math.random().toString(36).slice(2,12),c.n,c.s,c.b,daysAgo(30),daysAgo(-30),adminId,CUSTOMER_ID,randomFrom(['#007AFF','#34C759','#FF9500','#AF52DE'])]);
    console.log(`  ✓ ${c.n} (${c.s})`);
  }

  // === 9. Create activities ===
  console.log('\n=== Creating activities ===');
  const actTypes = ['post_published','post_scheduled','comment_replied','account_connected','ai_generated','team_joined','task_completed'];
  for (let i = 0; i < 20; i++) {
    const u = randomFrom(userIds);
    const t = randomFrom(actTypes);
    await tenant.query(`INSERT INTO "Activity" (id,"userId",type,description,"createdAt","customerId") VALUES ($1,$2,$3,$4,$5,$6)`,['act_'+Math.random().toString(36).slice(2,12),u.id,t,`${u.name} ${t.replace(/_/g,' ')}`,daysAgo(randomInt(0,7)),CUSTOMER_ID]);
  }
  console.log(`  ✓ 20 activities`);

  // === 10. Create listening queries ===
  console.log('\n=== Creating listening queries ===');
  for (const q of ['@synque','#synque','synque reviews','competitor brand mentions','social media management']) {
    await tenant.query(`INSERT INTO "ListeningQuery" (id,name,keywords,type,color,status,"customerId","createdAt") VALUES ($1,$2,$3,$4,$5,'active',$6,NOW())`,['lq_'+Math.random().toString(36).slice(2,12),q,q,randomFrom(['mention','keyword']),'#007AFF',CUSTOMER_ID]);
    console.log(`  ✓ "${q}"`);
  }

  // === 11. Create hashtags ===
  console.log('\n=== Creating hashtag groups ===');
  for (const h of [{t:'socialmedia',u:45,r:120000},{t:'contentmarketing',u:32,r:89000},{t:'brandstrategy',u:28,r:67000},{t:'digitalmarketing',u:51,r:230000},{t:'socialmediatools',u:19,r:45000}]) {
    await tenant.query(`INSERT INTO "HashtagGroup" (id,name,tags,platform,"usageCount","avgReach",color,"customerId","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,['hg_'+Math.random().toString(36).slice(2,12),h.t,h.t,randomFrom(PLATFORMS),h.u,h.r,'#007AFF',CUSTOMER_ID]);
    console.log(`  ✓ #${h.t}`);
  }

  // === 12. Create influencers ===
  console.log('\n=== Creating influencers ===');
  for (const inf of [{n:'TechWithSam',p:'youtube',f:125000,e:8.5,s:'contacted'},{n:'DesignByLisa',p:'instagram',f:89000,e:12.3,s:'active'},{n:'MarketingMike',p:'linkedin',f:45000,e:6.8,s:'interested'},{n:'CreativeCarol',p:'tiktok',f:234000,e:15.2,s:'active'}]) {
    await tenant.query(`INSERT INTO "Influencer" (id,name,handle,platform,followers,"engagementRate",cost,"estimatedReach","estimatedEngagement",status,"customerId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,['inf_'+Math.random().toString(36).slice(2,12),inf.n,'@'+inf.n.toLowerCase().replace(/\s/g,''),inf.p,inf.f,inf.e,randomInt(500,5000),inf.f*10,inf.f*inf.e/100,inf.s,CUSTOMER_ID]);
    console.log(`  ✓ ${inf.n} (${inf.p})`);
  }

  // === 13. Create competitors ===
  console.log('\n=== Creating competitors ===');
  for (const comp of [{n:'Hootsuite',p:'x',f:542000,e:2.3},{n:'Buffer',p:'instagram',f:178000,e:4.1},{n:'Sprout Social',p:'linkedin',f:89000,e:3.8}]) {
    await tenant.query(`INSERT INTO "Competitor" (id,name,handle,platform,followers,"engagementRate","growthRate","postingFreq",status,"customerId","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,NOW())`,['comp_'+Math.random().toString(36).slice(2,12),comp.n,'@'+comp.n.toLowerCase().replace(/\s/g,''),comp.p,comp.f,comp.e,randomFrom([2.1,3.5,1.8,4.2]),randomInt(3,15),CUSTOMER_ID]);
    console.log(`  ✓ ${comp.n}`);
  }

  // === 14. Create link in bio ===
  console.log('\n=== Creating link in bio ===');
  await tenant.query(`INSERT INTO "LinkInBio" (id,slug,title,theme,links,visits,clicks,active,"customerId","createdAt") VALUES ($1,$2,$3,$4,$5,0,0,true,$6,NOW())`,['lib_'+Math.random().toString(36).slice(2,12),'synque','SYNQUE Links','default',JSON.stringify([{title:'Website',url:'https://synque.vercel.app'},{title:'Pricing',url:'https://synque.vercel.app/pricing'},{title:'Help',url:'https://synque.vercel.app/help'}]),CUSTOMER_ID]);
  console.log(`  ✓ Link in bio (slug: synque)`);

  // === 15. Create notifications ===
  console.log('\n=== Creating notifications ===');
  const notifs = [
    {type:'post_published',title:'Post published',msg:'Your post "Q4 Product Launch" is live on Instagram'},
    {type:'comment_received',title:'New comment',msg:'Maya Chen commented on your post'},
    {type:'trial_expiring',title:'Trial expiring',msg:'Your trial expires in 5 days'},
    {type:'payment_received',title:'Payment received',msg:'Payment of $499 received'},
    {type:'team_invite',title:'New member',msg:'Ahmed Ali joined your workspace'},
  ];
  for (const n of notifs) {
    for (const u of userIds.slice(0, 3)) {
      await tenant.query(`INSERT INTO "Notification" (id,"userId",type,title,message,read,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())`,['ntf_'+Math.random().toString(36).slice(2,12),u.id,n.type,n.title,n.msg,Math.random()>0.5]);
    }
  }
  console.log(`  ✓ 15 notifications`);

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login: admin@smc.demo / Demo@2026 (all accounts same password)');
  await tenant.end();
  await mainDb.end();
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
