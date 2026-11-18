import test from 'node:test';
import assert from 'node:assert/strict';
import { createIgnavService } from '../src/services/ignavService.js';

test('Ignav distinguishes timeout, blocked networking and DNS failures without exposing secrets', async () => {
  for (const [error, code] of [
    [Object.assign(new Error('secret'), {name:'TimeoutError'}), 'IGNAV_TIMEOUT'],
    [Object.assign(new Error('secret'), {cause:{errors:[{code:'EACCES'}]}}), 'IGNAV_CONNECTION_BLOCKED'],
    [Object.assign(new Error('secret'), {cause:{code:'ENOTFOUND'}}), 'IGNAV_DNS_ERROR'],
    [Object.assign(new Error('secret'), {cause:{code:'ECONNRESET'}}), 'IGNAV_NETWORK_ERROR'],
  ]) {
    const service = createIgnavService({ignavKey:'secret'}, async()=>{throw error});
    await assert.rejects(service.bookingLinks('offer'), e=>e.code===code && !e.message.includes('secret'));
  }
});

test('Ignav booking lookup preserves separate legs and filters unsafe links', async () => {
  const service = createIgnavService({ignavKey:'test'}, async (url, init) => {
    assert.equal(url, 'https://ignav.com/api/fares/booking-links');
    assert.deepEqual(JSON.parse(init.body), {ignav_id:'offer-1'});
    return new Response(JSON.stringify({booking_options:[
      {legs:['outbound'],links:[{provider_name:'Airline A',url:'https://airline.example/out',specificity:'exact_flight'},{url:'javascript:alert(1)'}]},
      {legs:['inbound'],links:[{provider_name:'Airline B',url:'https://airline.example/back',specificity:'search_results'}]},
    ]}));
  });
  const result = await service.bookingLinks('offer-1');
  assert.equal(result.options.length,2);
  assert.equal(result.options[0].links.length,1);
  assert.deepEqual(result.options[1].legs,['inbound']);
  assert.equal(result.options[1].links[0].specificity,'search_results');
});
test('Ignav empty or incomplete booking coverage is not shown as a full trip',async()=>{
  for(const booking_options of [[],[{legs:['outbound'],links:[{url:'https://airline.example'}]},{legs:['inbound'],links:[]}],[{legs:['outbound'],links:[{url:'https://user:secret@airline.example'}]}]]) {
    const service=createIgnavService({ignavKey:'test'}, async()=>new Response(JSON.stringify({booking_options})));
    assert.deepEqual(await service.bookingLinks('offer-1'),{options:[]});
  }
});
