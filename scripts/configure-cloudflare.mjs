import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2);const value=flag=>args[args.indexOf(flag)+1];
const id=value('--database-id'),name=args.includes('--worker-name')?value('--worker-name'):'jess-counselling';
if(!args.includes('--database-id')||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')||!name||!/^[a-z0-9-]+$/.test(name))throw Error('Usage: node scripts/configure-cloudflare.mjs --database-id YOUR-D1-UUID [--worker-name jess-counselling]');
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));config.name=name;delete config.topLevelName;config.d1_databases=[{binding:'DB',database_name:'jess-bookings',database_id:id,migrations_dir:'../../drizzle'}];writeFileSync('dist/server/wrangler.cloudflare.json',JSON.stringify(config,null,2)+'\n');console.log('Cloudflare deployment configuration ready. Re-run this script after every build.');
