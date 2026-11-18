import test from "node:test";
import assert from "node:assert/strict";
import { answerChat } from "../src/services/homeChat.js";
const offline = () => { throw Error("offline"); };

test("Arabic guide and English follow-up share a destination", async () => {
  const dam = await answerChat({ message:"شو فيني شوف بدمشق؟",language:"ar" }, {}, offline);
  assert.equal(dam.link.href,"/guides/damascus");
  const season = await answerChat({ message:"Best time to visit?",language:"ar",context:dam.context }, {}, offline);
  assert.match(season.answer,/March/i);
});
test("public platform help works offline", async () => {
  const reply = await answerChat({message:"How do I edit a plan?",language:"en"}, {}, offline);
  assert.match(reply.answer,/regenerate/i);
});
test("place hours use the matched listing and preserve missing data", async () => {
  const input = {message:"Is it open now?",language:"en",context:{place:"Azem Palace",city:"DAM"}};
  let query;
  const send = async (url, opts) => {
    assert.match(url,/places.googleapis.com/);
    query = JSON.parse(opts.body).textQuery;
    return Response.json({ places:[{displayName:{text:"Azem Palace"},addressComponents:[{types:["locality"],longText:"Damascus"},{types:["country"],shortText:"SY"}],googleMapsUri:"https://maps.google.com/"}] });
  };
  const reply = await answerChat(input,{googleKey:"test"},send);
  assert.match(query,/Azem Palace.*Damascus/);
  assert.match(reply.answer,/hours are unavailable/i);
  assert.match(reply.link.href,/maps.google/);
});

test("Arabic Indonesia question overrides the previous city and supports a currency follow-up", async () => {
  const first = await answerChat({ message: "عطيني معلومات عن اندوسيا", language: "ar", context: { city: "DAM" } }, {}, offline);
  assert.match(first.answer, /بالي/);
  assert.equal(first.context.country, "ID");
  const second = await answerChat({ message: "What currency do they use?", language: "en", context: first.context }, {}, offline);
  assert.match(second.answer, /rupiah/);
});

test("a country outside the guides can provide a sourced overview", async () => {
  const result = await answerChat({ message: "Tell me about Kenya", language: "en" }, {}, async url => {
    assert.match(url, /page\/summary\/Kenya$/);
    return Response.json({ type: "standard", extract: "Kenya is in East Africa." });
  });
  assert.match(result.answer, /East Africa/);
  assert.equal(result.context.country, "KE");
});

test("Indonesia sightseeing answers stay specific across repeated turns and spellings", async () => {
  let context = {};
  for (const message of ["اريد اماكن سياحية في اندونيسيا", "اريد اماكن سياحية في اندونيسيا", "شو في معالم؟", "tourist attractions in Indonesia?"]) {
    const reply = await answerChat({ message, language: "ar", context }, {}, offline);
    assert.match(reply.answer, /بوروبودور|Borobudur/);
    assert.match(reply.answer, /برومو|Bromo/);
    context = reply.context;
  }
  for (const message of ["Indonesia?", "عطيني معلومات عن اندويسيا", "وين تقع إندونيسيا؟", "Tell me more about Indonesia"]) {
    const reply = await answerChat({ message, language: "en" }, {}, offline);
    assert.match(reply.answer, /Southeast Asia|جنوب شرق آسيا/);
  }
});

test("a destination correction clears old messages and persists the new city for follow-ups", async () => {
  const history = [{role:"assistant",text:"Indonesia has many islands."}];
  const requests = [];
  const localModel = async (url, opts) => {
    const body = JSON.parse(opts.body);
    requests.push(body.messages);
    return Response.json({message:{content:"من معالم أنقرة قلعة أنقرة."}});
  };
  const reply = await answerChat({message:"اي اقصد انقرة في تركيا",language:"ar",context:{country:"ID"},history},{},localModel);
  assert.equal(reply.context.country,"TR");
  assert.equal(reply.context.place,"أنقرة");
  assert.equal(requests.length,0);
  assert.match(reply.answer,/قلعة أنقرة/);
  await answerChat({message:"شو الأكل المشهور؟",language:"ar",context:reply.context},{},localModel);
  assert.match(requests[0].at(-1).content,/أنقرة/);
});

test("Lisbon recommendations only include listings with a matching city component", async () => {
  const listing = (name, city, country = "PT") => ({
    displayName: {text:name}, formattedAddress: "Near Lisbon",
    addressComponents: [{types:["locality"],longText:city},{types:["country"],shortText:country}],
  });
  const options = [listing("Outside landmark","Almada"),listing("Inside museum","Lisbon"),{displayName:{text:"Unverified"}}];
  const send = async url => {
    assert.match(url,/places.googleapis.com/);
    return Response.json({places:options});
  };
  const response = await answerChat({message:"What can I see in Lisbon?",language:"en"},{googleKey:"test"},send);
  assert.match(response.answer,/Inside museum/);
  assert.doesNotMatch(response.answer,/Outside landmark|Unverified/);
  const followup = await answerChat({message:"Any museums?",language:"en",context:response.context},{googleKey:"test"},send);
  assert.match(followup.answer,/Inside museum/);
  options.splice(1);
  const miss = await answerChat({message:"Any museums?",language:"en",context:response.context},{googleKey:"test"},send);
  assert.match(miss.answer,/couldn’t verify/);
});

test("a similar search result cannot confirm a named landmark belongs to a city",async () => {
  const send = async () => Response.json({places:[{displayName:{text:"Eiffel Cafe"},addressComponents:[{types:["locality"],longText:"Rome"}]}]});
  const reply = await answerChat({message:"Is the Eiffel Tower in Rome?",language:"en"},{googleKey:"test"},send);
  assert.match(reply.answer,/couldn’t verify/);
  assert.doesNotMatch(reply.answer,/Eiffel Cafe/);
});

test("a city-only answer completes the sightseeing request in English and Arabic", async () => {
  for (const [message, city, language, sight] of [
    ["Places in Turkey", "Istanbul", "en", "Hagia Sophia"],
    ["بدي أماكن سياحية في تركيا", "اسطنبول", "ar", "آيا صوفيا"],
  ]) {
    const ask = await answerChat({message,language}, {}, offline);
    assert.equal(ask.context.pendingPlaces,message);
    const places = await answerChat({message:city,language,context:ask.context}, {}, offline);
    assert.ok(places.answer.includes(sight));
    assert.equal(places.context.pendingPlaces,undefined);
  }
});

test("a city outside the guide completes the original filtered Places search", async () => {
  const ask = await answerChat({message:"Find seafood restaurants in Turkey",language:"en"}, {}, offline);
  let query;
  const result = await answerChat({message:"Izmir",language:"en",context:ask.context}, {googleKey:"test"}, async (_,opts) => {
    query = JSON.parse(opts.body).textQuery;
    return Response.json({places:[{displayName:{text:"Matched restaurant"},addressComponents:[
      {types:["locality"],longText:"Izmir"},{types:["country"],shortText:"TR"}
    ]}]});
  });
  assert.match(query,/seafood restaurants.*Izmir/i);
  assert.match(result.answer,/Matched restaurant/);
  assert.equal(result.context.country,"TR");
});

test("country location then sightseeing in Arabic with and without repeating Spain", async () => {
  const first = await answerChat({message:"أين تقع اسبانيا",language:"ar"}, {}, offline);
  assert.match(first.answer,/جنوب غرب أوروبا/);
  for (const message of ["عطيني اماكن سياحية ب اسبانيا","عطيني أماكن سياحية فيها"]) {
    const sights = await answerChat({message,language:"ar",context:first.context}, {}, offline);
    assert.match(sights.answer,/برشلونة/);
    assert.match(sights.answer,/غرناطة/);
  }
});
test("country searches filter by country while allowing different cities",async () => {
  const first = await answerChat({message:"Where is Japan?",language:"en"}, {}, offline);
  assert.match(first.answer,/Eastern Asia/);
  const listing = (name,code) => ({displayName:{text:name},addressComponents:[{types:["country"],shortText:code}]});
  const second = await answerChat({message:"Recommend museums there",language:"en",context:first.context},{googleKey:"test"},
    async () => Response.json({places:[listing("Tokyo sight","JP"),listing("Kyoto sight","JP"),listing("Foreign sight","KR")]}));
  assert.match(second.answer,/Tokyo sight/); assert.match(second.answer,/Kyoto sight/); assert.doesNotMatch(second.answer,/Foreign/);
});

test("general Arabic country questions keep their scope for heritage recommendations offline", async () => {
  for (const [name,code] of [["كندا","CA"],["البرازيل","BR"],["اليابان","JP"],["كينيا","KE"],["أستراليا","AU"]]) {
    const first = await answerChat({message:"أعطني معلومات عن دولة " + name,language:"ar"}, {}, offline);
    assert.equal(first.context.country,code);
    assert.match(first.answer,/تقع/);
    for (const followup of ["طيب شو في مناطق سياحية فيها؟", "شو بتنصحني أزور بهالبلد؟"]) {
      const result = await answerChat({message:followup,context:first.context,language:"ar"}, {}, offline);
      assert.equal(result.context.country,code);
      assert.match(result.answer,/•/);
      assert.match(result.link.href,/whc.unesco.org/);
    }
  }
});

test("a capital question replaces a pending sightseeing search and resolves country follow-ups", async () => {
  const initial = await answerChat({message:"اماكن سياحية في المغرب",language:"ar"}, {}, offline);
  const answer = await answerChat({message:"ماهي عاصمة المغرب؟",language:"ar",context:initial.context}, {}, offline);
  assert.equal(answer.answer,"عاصمة المغرب هي الرباط.");
  const follow = await answerChat({message:"What's its capital?",language:"en",context:answer.context}, {}, offline);
  assert.equal(follow.answer,"The capital of Morocco is Rabat.");
  const clarify = await answerChat({message:"شو عاصمتها؟",language:"ar"}, {}, offline);
  const japan = await answerChat({message:"اليابان",language:"ar",context:clarify.context}, {}, offline);
  assert.match(japan.answer,/طوكيو/);
});

test("Morocco shows three at a time and resolves names and ordinals on the displayed page", async () => {
  const send = (message,context,fetchImpl=offline) => answerChat({message,context,language:"ar"},{},fetchImpl);
  const first = await send("أماكن سياحية في المغرب");
  const more = await send("عطيني أماكن زيادة",first.context);
  const names = s => s.answer.split("\n").map(n => n.replace(/^• /,""));
  assert.equal(names(first).length,3); assert.equal(names(more).length,3);
  assert.ok(names(more).every(n => !names(first).includes(n)));
  const detail = await send("احكيلي عن المكان الثاني",more.context, async () =>
    Response.json({results:[{short_description_ar:"وصف المعلم المطلوب"}]}));
  assert.match(detail.answer,/وصف المعلم المطلوب/);
  assert.ok(detail.answer.includes(names(more)[1]));
  const earlier = await send("عطيني معلومات عن فاس",detail.context);
  assert.ok(earlier.answer.includes(names(first)[0]));
  const last = await send("كمان",earlier.context);
  assert.equal(names(last).length,3);
  assert.match((await send("غيرهم",last.context)).answer,/كل الأماكن/);
});

test("Arabic city switch replaces Norway's list and أول مكان describes Barcelona's first result", async () => {
  const norway = await answerChat({language:"ar", message:"عطيني اماكن سياحية بالنرويج"},{},offline);
  assert.equal(norway.context.country,"NO");
  for (const message of ["عطيني اماكن ب برشلونة","أماكن سياحية ببرشلونة","أماكن في برشلونة"]) {
    const result = await answerChat({language:"ar",message,context:norway.context},{googleKey:"test"},async (url,opts) => {
      assert.match(url,/places.googleapis.com/);
      assert.doesNotMatch(JSON.parse(opts.body).textQuery,/Norway|النرويج/);
      return Response.json({places:[{displayName:{text:"معلم برشلونة"},editorialSummary:{text:"تفاصيل المعلم"},addressComponents:[{longText:"برشلونة",types:["locality"]}]}]});
    });
    assert.notEqual(result.context.listId,norway.context.listId);
    assert.match(result.answer,/معلم برشلونة/);
    const follow = await answerChat({language:"ar",message:"طيب اشرحلي عن اول مكان",context:result.context},{},offline);
    assert.match(follow.answer,/تفاصيل المعلم/);
  }
});

test("Manila's Arabic name and English listing addresses resolve to the same city across turns", async () => {
  const place=(name,city,cc)=>({displayName:{text:name},addressComponents:[
    {longText:city,types:["locality"]},{shortText:cc,types:["country"]}]});
  const provider=async (url,opts)=>{
    if (url.includes("/places/manila-city?")) return Response.json({displayName:{text:"Manila"}});
    const query=JSON.parse(opts.body);
    if(query.includedType==="locality") return Response.json({places:[{...place("منیلا","منیلا","PH"),id:"manila-city"}]});
    return Response.json({places:[place("حصن سانتياغو","Manila","PH"),place("Nearby","Pasay","PH"),place("Other Manila","Manila","US")]});
  };
  let context={};
  for(const message of ["اماكن سياحية في مانيلا","شوفي اماكن سياحية فيها ؟"]){
    const result=await answerChat({message,language:"ar",context},{googleKey:"test"},provider);
    assert.match(result.answer,/حصن سانتياغو/);
    assert.doesNotMatch(result.answer,/Nearby|Other Manila/);
    assert.equal(result.context.locality,"مانيلا");
    context=result.context;
  }
});

test("named address search uses an exact result or asks which city for that specific place",async()=>{
  const market = city => ({displayName:{text:"السوق الطويل"},formattedAddress:city+"، سوريا",addressComponents:[{types:["locality"],longText:city},{types:["country"],shortText:"SY"}]});
  const places=[market("حماة")];
  const provider=async()=>Response.json({places});
  const input={message:"أين يقع السوق الطويل",language:"ar",context:{pendingPlaces:"أماكن سياحية"}};
  const one=await answerChat(input,{googleKey:"test"},provider);
  assert.match(one.answer,/حماة/);
  places.push(market("دمشق"));
  const ask=await answerChat(input,{googleKey:"test"},provider);
  assert.match(ask.answer,/بأي مدينة تقصد «السوق الطويل»/);
  const exact=await answerChat({message:"دمشق",language:"ar",context:ask.context},{googleKey:"test"},provider);
  assert.match(exact.answer,/السوق الطويل — دمشق/);
});

test("Madinah mosque aliases and name-first Arabic location questions resolve directly",async()=>{
  const first=await answerChat({message:"أين يقع الحرم المدني؟",language:"ar"},{},offline);
  assert.match(first.answer,/المسجد النبوي.*وسط المدينة المنورة/);
  const second=await answerChat({message:"مسجد القبلتين اين يقع؟",language:"ar",context:{...first.context,pendingPlaces:"أين يقع الحرم المدني؟"}},{},offline);
  assert.match(second.answer,/مسجد القبلتين على طريق خالد بن الوليد/);
  assert.equal(second.context.place,"مسجد القبلتين");
});

test("more after a short Google list uses the provider page and skips duplicates and neighbouring cities",async()=>{
  const place=(name,city="Lisbon")=>({id:name,displayName:{text:name},addressComponents:[{types:["locality"],longText:city}]});
  const queries=[];
  const send=async(url,opts)=>{
    const query=JSON.parse(opts.body); queries.push(query);
    return Response.json(query.pageToken ? {places:[place("One"),place("Outside","Almada"),place("Two"),place("Three")]} :
      {places:[place("One")],nextPageToken:"next"});
  };
  const first=await answerChat({message:"museums in Lisbon",language:"en"},{googleKey:"test"},send);
  const next=await answerChat({message:"عطيني كمان",language:"ar",context:first.context},{googleKey:"test"},send);
  assert.match(next.answer,/Two/); assert.match(next.answer,/Three/);
  assert.doesNotMatch(next.answer,/Outside|One/);
  assert.equal(queries[0].textQuery,queries[1].textQuery);
  assert.equal(queries[1].pageToken,"next");
  const beforeRetry=queries.length;
  const retry=await answerChat({message:"عطيني كمان",language:"ar",context:first.context},{googleKey:"test"},send);
  assert.equal(next.answer,retry.answer);
  assert.equal(queries.length,beforeRetry);
});

test("Levantine وين صارت works before or after the place name and as a follow-up", async () => {
  const ask = (message,context) => answerChat({message,language:"ar",context},{},offline);
  const formal = await ask("أين تقع إسبانيا؟");
  for (const text of ["وين صارت إسبانيا؟","إسبانيا وين صارت؟"]) {
    assert.equal((await ask(text)).answer,formal.answer);
  }
  assert.equal((await ask("وين صارت؟",formal.context)).answer,formal.answer);
  const mosque = await ask("مسجد القبلتين وين صارت؟");
  assert.match(mosque.answer,/خالد بن الوليد/);
  assert.equal((await ask("طيب وين صارت؟",mosque.context)).answer,mosque.answer);
  assert.match((await ask("وين صارت؟")).answer,/أي مكان/);
});

test("last place refers to the last visible result, including after more or a missing list",async()=>{
  const ask=(message,context)=>answerChat({message,language:"ar",context},{},offline);
  const first=await ask("أماكن سياحية في المغرب");
  const more=await ask("عطيني كمان",first.context);
  for (const page of [first,more]) {
    const last=page.answer.split("\n").at(-1).replace(/^• /,"");
    const detail=await ask("اشرحي اكتر عن المكان الأخير",page.context);
    assert.ok(detail.answer.includes(last));
    assert.equal(detail.context.focused,page.context.pageEnd-1);
  }
  assert.match((await ask("اشرحي اكتر عن المكان الأخير")).answer,/اسم المعلم/);
});

test("platform introductions recognize Arabic use, purpose and identity questions before travel context",async()=>{
  for(const message of ["كييف استعمل جلجامش","كيف استعمل الموقع"]){
    const r=await answerChat({message,language:"ar",context:{pendingPlaces:"معالم في فرنسا"}},{},offline);
    assert.equal(r.link.href,"/planner");assert.match(r.answer,/اختَر اهتماماتك/);
  }
  for(const message of ["شو الهدف من جلجامش سمارت؟","الهدف من جلجامش","شو هدف الموقع؟"]){
    assert.match((await answerChat({message,language:"ar"},{},offline)).answer,/هدف جلجامش سمارت/);
  }
  for(const message of ["اشرحلي عنكم","عرفني عن نفسكم","مين انتو؟"]){
    assert.match((await answerChat({message,language:"ar"},{},offline)).answer,/منصّة لتخطيط السفر/);
  }
});
