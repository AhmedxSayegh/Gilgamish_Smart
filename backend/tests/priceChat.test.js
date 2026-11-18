import test from "node:test";
import assert from "node:assert/strict";
import {priceChat} from "../src/services/priceChat.js";
const date="2099-02-01", end="2099-02-04";

test("Arabic flight price keeps route, dates and count across messages, with provider total",async()=>{
  const calls=[];
  const provider={modes:{flights:"ignav"},travel:{flights:async trip=>{
    calls.push(trip);return [{airlineName:"Example",price:"840.00",currency:"SAR"}];
  }}};
  let context={};
  for(const message of ["قديش تذكرة طيران من جدة إلى اسطنبول؟",date+" "+end,"2 بالغين"]){
    const reply=await priceChat({message,language:"ar",context},provider);
    context=reply.context;
    if(calls.length) assert.match(reply.answer,/840.00 SAR/);
  }
  assert.equal(calls.length,1);
  assert.deepEqual([calls[0].originCode,calls[0].destinationCode,calls[0].adults,calls[0].endDate],["JED","IST",2,end]);
});
test("hotel price filters a named property and labels full stay",async()=>{
 const provider={modes:{hotels:"serpapi"},travel:{hotels:async(t,opts)=>{
 assert.equal(t.adults,2);assert.equal(opts.hotelName,"هيلتون");return [
 {name:"فندق آخر",price:"20",currency:"SAR"},{name:"هيلتون دبي",price:"700",currency:"SAR"}];}}};
 const reply=await priceChat({message:"سعر فندق هيلتون في دبي "+date+" "+end+" 2 بالغين",language:"ar"},provider);
 assert.match(reply.answer,/700 SAR/);assert.match(reply.answer,/كامل الإقامة/); assert.doesNotMatch(reply.answer,/فندق آخر/);
});
test("ordinary venue requests bypass pricing; mock pricing and unsupported occupancy do not produce quotes",async()=>{
 assert.equal(await priceChat({message:"فنادق في دبي",language:"ar"},{}),null);
 const quoteSubmit={kind:"hotels",destination:"Dubai",startDate:date,endDate:end,adults:2,children:1};
 const ask=()=>priceChat({message:"Search prices",language:"en",quoteSubmit},{modes:{hotels:"mock"}});
 assert.match((await ask()).answer,/adults only/);
 quoteSubmit.children=0;
 assert.match((await ask()).answer,/unavailable/);
});
