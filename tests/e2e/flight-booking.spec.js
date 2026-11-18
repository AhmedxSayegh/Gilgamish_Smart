const { test, expect } = require('@playwright/test');
test.use({channel:'msedge'});
test('Ignav booking control loads split links, empty state and retry without automatic navigation', async ({page})=>{
  let scenario='split',calls=0; page.on('pageerror', e=>console.log('PAGE ERROR', e.message));
  await page.route('**/api/**',async route=>{
    const url=route.request().url();
    if(url.endsWith('/flights/booking-links')) {
      calls++; expect(route.request().postDataJSON()).toEqual({offerId:'test-offer'});
      if(scenario==='error') return route.fulfill({status:502,json:{success:false,error:{message:'Provider error'}}});
      return route.fulfill({json:{success:true,data:{options:scenario==='empty'?[]:[
        {legs:['outbound'],links:[{providerName:'Airline outbound',url:'https://airline.example/out'}]},
        {legs:['inbound'],links:[{providerName:'Airline return',url:'https://airline.example/back'}]},
      ]}}});
    }
    return route.fulfill({json:{success:true,data:url.endsWith('/auth/me')?{user:{name:'Test',language:'en'},csrfToken:'test'}:{mode:'mixed'}}});
  });
  await page.route('**/__booking-test',route=>route.fulfill({contentType:'text/html',body:`<html><body><div id="root"></div><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;
    const {AppProvider} = await import('/src/lib/context.jsx');
    const {FlightBookingLink} = await import('/src/components/FlightBookingLink.jsx');
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(AppProvider,null,React.createElement(FlightBookingLink,{offer:{id:'test',provider:'ignav',providerOfferId:'test-offer',bookingUrl:null}},'Provider search')));
  </script></body></html>`}));
  await page.goto('/__booking-test'); await expect(page.getByRole('button',{name:'Provider search'})).toBeVisible({timeout:10000});
  await page.getByRole('button',{name:'Provider search'}).click();
  await expect(page.getByText('Separate bookings are required:',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Airline return'})).toHaveAttribute('href','https://airline.example/back');
  await expect(page.getByRole('link',{name:'Airline outbound'})).toHaveAttribute('target','_blank');
  expect(calls).toBe(1);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  scenario='empty'; await page.getByRole('button',{name:'Provider search'}).click();
  await expect(page.getByText('The provider has no usable booking links',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  scenario='error'; await page.getByRole('button',{name:'Provider search'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  scenario='split';await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByRole('link',{name:'Airline return'})).toBeVisible();
});
