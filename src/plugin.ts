import { registerCommercePlugin } from '@builder.io/commerce-plugin-tools';
import { Seller } from '@builder.io/commerce-plugin-tools/dist/types/interfaces/resource';
import pkg from '../package.json';
import appState from '@builder.io/app-context';

registerCommercePlugin(
  {
    name: 'Vtex',
    id: pkg.name,
    settings: [
      {
        name: 'accountName',
        type: 'string',
        helperText: `Get your accountname from your account details in Vtex admin dasbhoard, on (/admin/license-manager/#/account-details) `,
        required: true,
      },
      {
        name: 'secretKey',
        friendlyName: 'Application Secret',
        helperText: `Get your application secret from "{{account name}}.myvtex.com/admin/mykeys" and copy the application secret, or generate a new one if you don't have keys configured `,
        type: 'string',
        required: true,
      },
      {
        name: 'accessKey',
        friendlyName: 'Application Key',
        helperText: `Get your application key from "{{account name}}.myvtex.com/admin/mykeys" and copy the application key, or generate a new one if you don't have keys configured `,
        type: 'string',
        required: true,
      },
    ],
    ctaText: `Connect your Vtex store`,
  },
  settings => {
    const basicCache = new Map();

    const secretKey = settings.get('secretKey');
    const accessKey = settings.get('accessKey');
    const accountName = settings.get('accountName');
    const environment = 'vtexcommercestable';

    const baseUrl = (url: string) => {
      const endUrl = `https://${accountName}.${environment}.com.br/${url}`;
      return `${appState.config.apiRoot()}/api/v1/proxy-api?url=${encodeURIComponent(endUrl)}`;
    };

    const headers = {
      'X-VTEX-API-AppToken': secretKey,
      'X-VTEX-API-AppKey': accessKey,
      Accept: 'application/json; charset=utf-8',
      'Content-Type': 'application/json',
    };

    const transformSeller = (seller: any) => ({
      id: seller.id,
      title: seller.name,
      handle: '',
      isActive: seller.isActive     
    });

    const service = {
      seller: {
        async findById(id: string) {
          const key = `${id}categoryById`;
          // https://{accountName}.{environment}.com.br/api/seller-register/pvt/sellers/{sellerId}
          const seller =
            basicCache.get(key) ||
            (await fetch(baseUrl(`api/seller-register/pvt/sellers/${id}`), { headers })
              .then(res => res.json())
              .then(transformSeller)
            );
          basicCache.set(key, seller);
          return seller;
        },
                
        async search() {
          const response: any = await fetch(
            baseUrl(`/api/seller-register/pvt/sellers`), {headers,}
          ).then(res => {
            return res.json();
          });

          const sellers = await response?.items.map(({id, name, isActive}: any) => ({ id, title: name, isActive}))
          return sellers as Seller[];
        },

        getRequestObject(id: string) {
          return {
            '@type': '@builder.io/core:Request' as const,
            request: {
              url: baseUrl(`api/seller-register/pvt/sellers/${id}`),
              headers,
            },
            options: {
              seller: id,
            },
          };
        },
      },
    };
    return service;
  }
);
