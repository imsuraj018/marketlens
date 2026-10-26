
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

console.log('Supabase configuration:', {
  urlPresent: Boolean(url),
  keyPresent: Boolean(key),
  urlIsPlaceholder: url?.includes('YOUR_PROJECT'),
  keyIsPlaceholder: key?.includes('YOUR_'),
});

if (!url || !key) {
  throw new Error('Missing Supabase environment variables.');
}

export const db = createClient(url, key);

export type Role='customer'|'business_owner'|'analyst'|'admin';
export type Profile={id:string;full_name:string;role:Role;phone:string|null;is_active:boolean};
export type Business={id:string;owner_id:string;name:string;slug:string;description:string;category_id:string;location_id:string;phone:string|null;email:string|null;address:string|null;status:string;created_at:string};
export function errorText(e:unknown){return e instanceof Error?e.message:String(e)}
export function money(v:number){return '₹'+v.toLocaleString('en-IN',{maximumFractionDigits:0})}
export async function track(type:'business_view'|'business_search',value:string){const {data}=await db.auth.getUser();if(!data.user)return;await db.rpc(type==='business_view'?'record_business_view':'record_search',type==='business_view'?{p_business:value}:{p_query:value});}
