const requestQuery = {
  message:
    'GCash Query API Payload Sent by Greenwich for payment id 67e7bc605a803e4e16e2e187 and order id: 67e7bc6075884ff1ef30f6b2: ',
  payload: {
    request: {
      head: {
        version: '2.0',
        function: 'gcash.acquiring.order.query',
        clientId: '2023080416042600085926',
        clientSecret: '20230804160426000859262KCGPP',
        reqMsgId: '67e7bc605a803e4e16e2e187',
        reqTime: '2025-03-29T17:27:18+08:00',
      },
      body: {
        merchantId: '217020000219377909708',
        acquirementId: '20250329121212800110170099644799275',
      },
    },
    signature:
      'GfsjKAiBj2XkLg6NmOi5h1f4F4Il+OqQYhnxZRf/6u+6sRHXMCdE2eoEN538HaGzNhmtIvH6dnxWAipQC4VuHMuSBa3yYpjtNKBSIrZ+7LWVmbv+MqiJtr9z66xpiViW0TPk+n/eIBV96Y4XCckMgvHdJDupyhxzPS+GW3EKfL7BCngJgEGoMjTj06RmM0W//aN8WW7A0St6hifDtTWQW4LIhrwJjVbu1u3UALy6YjeM11cDihzmUm75KFHb/zawKPzvAHOyVLZAXXa76/+K8KtBt7c1AFnY6PYX96od4++e4XWmxM3nHc9/pHIr1fvWPIL6E0pqZOWMmCUXCx4gTA==',
  },
};

const responseQuery = {
  message:
    'GCash Query API: Response Received by Greenwich for payment id 67e7bc605a803e4e16e2e187 and order id: 67e7bc6075884ff1ef30f6b2: ',
  response: {
    response: {
      head: {
        function: 'gcash.acquiring.order.query',
        clientId: '2023080416042600085926',
        version: '2.0',
        respTime: '2025-03-29T17:27:18+08:00',
        reqMsgId: '67e7bc605a803e4e16e2e187',
      },
      body: {
        acquirementId: '20250329121212800110170099644799275',
        amountDetail: {
          chargeAmount: {
            currency: 'PHP',
            value: '0',
          },
          chargebackAmount: {
            currency: 'PHP',
            value: '0',
          },
          confirmAmount: {
            currency: 'PHP',
            value: '0',
          },
          orderAmount: {
            currency: 'PHP',
            value: '49900',
          },
          payAmount: {
            currency: 'PHP',
            value: '49900',
          },
          refundAmount: {
            currency: 'PHP',
            value: '0',
          },
          voidAmount: {
            currency: 'PHP',
            value: '0',
          },
        },
        buyer: {
          externalUserId: '67e7bc605a803e4e16e2e187',
          externalUserType: '67e7bc605a803e4e16e2e187',
          userId: '217010000002964160760',
        },
        extendInfo: '{}',
        merchantTransId: 'GW-3081-0443419',
        orderTitle: 'Greenwich',
        paymentViews: [
          {
            cashierRequestId: 'e7722cf74d4e2bc99275b8f723e2a3d1',
            extendInfo: '{"topupAndPay":"false","paymentStatus":"SUCCESS"}',
            paidTime: '2025-03-29T17:25:13+08:00',
            payOptionInfos: [
              {
                chargeAmount: {
                  currency: 'PHP',
                  value: '0',
                },
                payAmount: {
                  currency: 'PHP',
                  value: '49900',
                },
                payMethod: 'BALANCE',
                transAmount: {
                  currency: 'PHP',
                  value: '49900',
                },
              },
            ],
          },
        ],
        resultInfo: {
          resultCodeId: '00000000',
          resultMsg: 'SUCCESS',
          resultStatus: 'S',
          resultCode: 'SUCCESS',
        },
        seller: {
          externalUserId: '67e7bc605a803e4e16e2e187',
          externalUserType: '67e7bc605a803e4e16e2e187',
          userId: '',
        },
        statusDetail: {
          acquirementStatus: 'SUCCESS',
          frozen: 'false',
        },
        timeDetail: {
          confirmedTimes: [],
          createdTime: '2025-03-29T17:24:48+08:00',
          expiryTime: '2025-03-29T17:29:48+08:00',
          paidTimes: ['2025-03-29T17:25:14+08:00'],
        },
        transactionId: '041568102',
      },
    },
    signature:
      'hihaVZhvOUpAgcTk68KDQL19s0ilT+NnmGFDjBuiuUFSBeWBeu/rz0zQ0WydCpRNY/S+WyPxaPQAAWPm+A5qyCXHWRYEWLk/7mtDwkGlsf6NijJkNiRLDYbaSEYh99ct8OyS9FuX4hraVwSn7kr03Wh8HUx+tQFHdxFFIgvsI7E4/1c1qDiPcVPL0D+b3qnMYv6tEPhATa1C0swmq2+WNllJNGsCS0kY8Wo2fByKHHlOXWm+FNglf37jsDZ/E4YraxwUWD0gJzzzfadlmvgRfO0DfbLfoCuxkQzJq2er+gBjWmSD0a6nBEQpnZZB4gcm56ybxM707FrZqZmKqs4oxQ==',
  },
};

const requestNotify = {
  message: 'GCash Notify API Payload Received by Greenwich',
  payload: {
    request: {
      head: {
        function: 'gcash.acquiring.order.finish.notify',
        clientId: '2023080416042600085926',
        version: '2.0',
        reqTime: '2025-03-29T17:25:14+08:00',
        reqMsgId: '5144e96a-a652-4722-83aa-41a99d48f4cd',
      },
      body: {
        acquirementId: '20250329121212800110170099644799275',
        orderAmount: {
          currency: 'PHP',
          value: '49900',
        },
        merchantId: '217020000219377909708',
        merchantTransId: 'GW-3081-0443419',
        finishedTime: '2025-03-29T17:25:14+08:00',
        createdTime: '2025-03-29T17:24:48+08:00',
        acquirementStatus: 'SUCCESS',
        extendInfo: '{}',
        transactionId: '041568102',
      },
    },
    signature:
      'Gqf+IbJ+nIXKOgwBlMowFHmFE2EEjGnrdGoLkZFKzR0lTc9BD5RAt/Sjr7/UUzhDAaDzommQMAGey00QEeyWZqXTWa/QHKI6V0ztEI7Lx1MuamJqgaCCw0haaob01DjJsFVpCnNOn58foQZoJAKszl9QfacWOtgFc4TGN5OuY7e5nRmgWuvcjsFb+kxpR35SAaVVplQCuLlTMIol6hEJNETqKQWtgBS1jU9Y03qv16Rp405Re0m89LgpE4QEuUneo+J+ui1Owyn56vbhfczZJqoyA5S6HErfTB9iWawpcffP3lQskxz+K/NobMx8GXN/hzWhcEXjSpy8tXZQmomtcA==',
  },
};
