const CONFIG = {
  servers: [
    {
      id: 'fi-server',
      label: 'Сервер в Финляндии',
      ip: '91.211.114.182',
      port: 80,
    },
    {
      id: 'ru-server',
      label: 'Сервер в России',
      ip: '185.228.235.125',
      port: 80,
    },
  ],
  checkNodes: [
    { id: 'ru1.node.check-host.net', label: 'Россия', code: 'RU' },
    { id: 'fi1.node.check-host.net', label: 'Финляндия', code: 'FI' },
    { id: 'nl1.node.check-host.net', label: 'Нидерланды', code: 'NL' },
    { id: 'de1.node.check-host.net', label: 'Германия', code: 'DE' },
    { id: 'us1.node.check-host.net', label: 'США', code: 'US' },
    { id: 'ch1.node.check-host.net', label: 'Швейцария', code: 'CH' },
  ],
  corsProxies: [
    'https://corsproxy.io/?',
  ],
  pollAttempts: 8,
  pollDelay: 1500,
};
