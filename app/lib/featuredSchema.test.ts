// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
it('keeps config unique, constrained, service-only and separate from Show deletion',async()=>{
 const db=new PGlite()
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create table public.shows(id uuid primary key);insert into shows values('11111111-1111-4111-8111-111111111111');")
  await db.exec(readFileSync('supabase/migrations/20261030233143_featured_hero_positions.sql','utf8'))
  await db.exec("insert into featured_show_config(show_id,storage_path) values('11111111-1111-4111-8111-111111111111','featured/ARC.webp')")
  expect((await db.query('select position_x,position_y from featured_show_config')).rows).toEqual([{position_x:50,position_y:50}])
  await expect(db.exec('update featured_show_config set position_x=101')).rejects.toThrow()
  await expect(db.exec("update featured_show_config set storage_path='featured/../x.webp'")).rejects.toThrow()
  expect((await db.query("select has_table_privilege('anon','featured_show_config','select') as anon,has_table_privilege('authenticated','featured_show_config','update') as member")).rows).toEqual([{anon:false,member:false}])
  await db.exec('delete from featured_show_config');expect((await db.query('select * from shows')).rows).toHaveLength(1)
 }finally{await db.close()}
})
