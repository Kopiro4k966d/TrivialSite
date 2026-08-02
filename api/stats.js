import pool from './db.js';
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({success:false,message:'Method not allowed'});
  try{await pool.query('CREATE TABLE IF NOT EXISTS site_stats (id INTEGER PRIMARY KEY, visitors_count INTEGER NOT NULL DEFAULT 247)');await pool.query('INSERT INTO site_stats (id,visitors_count) VALUES (1,247) ON CONFLICT (id) DO NOTHING');const result=await pool.query('UPDATE site_stats SET visitors_count=visitors_count+1 WHERE id=1 RETURNING visitors_count');return res.json({success:true,count:Number(result.rows[0].visitors_count).toLocaleString('ru-RU')});}catch(error){return res.status(200).json({success:true,count:'247'});}
}
