// import {web3} from './web3-obj.js';
import addressList from "~/abi/config.js";
import {
  Token,
  Fetcher,
  Route,
  Pair,
  TokenAmount,
  sortsBefore,
} from "@pancakeswap-libs/sdk";
import WalletConnectProvider from "@walletconnect/web3-provider";
import precision from "~/assets/js/precision.js";
import { Contract } from "@ethersproject/contracts";
import { getNetwork } from "@ethersproject/networks";
import { getDefaultProvider } from "@ethersproject/providers";
import IPancakePair from "@pancakeswap-libs/pancake-swap-core/build/IPancakePair.json";
import ERC20 from "~/abi/ERC20_abi.json";

const selectNetwork = (charID) => {
  switch (charID) {
    case 1:
      return "Main";
    case 3:
      return "Ropsten";
    case 56:
      return "BSC";
    default:
      // return 'Ropsten';
      return "Rinkeby";
  }
};

// 获取地址
export const getAddress = (symbol, char_id) => {
  const charID = char_id || window.chainID;
  const network = selectNetwork(charID);
  let address = addressList[`${network}_${symbol}`];
  if (address) {
    return address.toLowerCase();
  } else {
    return null;
  }
};
// 获取合约
export const getContract = (name, charID = 3) => {
  const network = selectNetwork(charID);
  let contract = addressList[`${network}_CONTRACT_${name}`];
  if (contract) {
    return contract;
  } else {
    return null;
  }
};
export const getSymbol = (address, char_id) => {
  const charID = char_id || window.chainID;
  let symbol_list = ["WETH", "USDT", "USDC", "DAI", "WBTC", "CRV", "UNI"];
  const symbol = symbol_list.filter((item) => {
    return getAddress(item, charID) === address.toLowerCase();
  });
  if (symbol) {
    return symbol;
  } else {
    return ["NULL"];
  }
};

// 为什么多写了个返回值不一样的函数，后面确定逻辑后优化下
export const newGetSymbol = (adress) => {
  const charID = window.chainID;
  let symbol_list = ["WETH", "USDT", "USDC", "DAI", "WBTC", "CRV", "UNI"];
  const symbol = symbol_list.filter((item) => {
    return getAddress(item, charID) === adress.toLowerCase();
  });
  if (symbol) {
    return symbol[0];
  } else {
    return null;
    // return console.log(adress + '没有找到对应的Symbol')
  }
};

export const getWei = (token) => {
  let reg = /^0x[\S]+/;
  if (reg.test(token)) {
    // 0x adress
    token = getSymbol(token)[0];
  }
  switch (token) {
    case "USDT":
      return "lovelace"; // 6
    case "USDC":
      return "lovelace"; // 6
    default:
      return "ether"; // 18
  }
};

export const getWeiWithFix = (fix) => {
  switch (fix) {
    case 30:
      return "tether"; // 30
    default:
      return "ether"; // 18
  }
};

export const getStrikePriceFix = (und, col) => {
  // 币种，抵押物, 结算物
  let colFix = getWei_2(col);
  let undFix = getWei_2(und);
  if (colFix === undFix) {
    return 18;
  } else {
    return 18 + colFix - undFix;
  }
};

// 处理行权价格
export const dealWithStrikePrice = (px, coin) => {
  let coinFix = getWei_2(coin);
  if (coinFix !== 18) {
    return precision.divide(px, Math.pow(10, 30 - coinFix));
  } else {
    return px;
  }
};

// getWei和getWei_2不知何为， 后面更换注释
export const getWei_2 = (token) => {
  let reg = /^0x[\S]+/;
  if (reg.test(token)) {
    // 0x adress
    token = getSymbol(token)[0];
  }
  switch (token) {
    case "USDT":
      return 6; // 6
    case "USDC":
      return 6; // 6
    default:
      return 18; // 18
  }
};

// 获取id
export const getID = async () => {
  // const WEB3 = await web3();
  if (typeof window.ethereum !== "undefined") {
    const chainId = await window.WEB3.eth.net.getId();
    return chainId;
  } else {
    const walletConnectProvider = new WalletConnectProvider({
      infuraId: "3cd774e14cf34ff78167908f8377051c", // Required
      // bridge: 'https://bridge.myhostedserver.com'
      // qrcode: true
    });
    if (walletConnectProvider.networkId) {
      return walletConnectProvider.networkId;
    } else {
      return 1;
    }
  }
};

// UniSwap SDK
export const uniswap = async (token1, token2) => {
  const address1 = getAddress(token1, window.chainID);
  const address2 = getAddress(token2, window.chainID);
  const TOKEN1 = new Token(
    window.chainID,
    address1,
    getWei_2(token1),
    token1,
    token1
  );
  const TOKEN2 = new Token(
    window.chainID,
    address2,
    getWei_2(token2),
    token2,
    token2
  );
  console.log(token1, token2);
  try {
    // 获取交易对地址
    const address = Pair.getAddress(TOKEN1, TOKEN2);
    // 获取Provider
    let provider = getDefaultProvider(getNetwork("56"));
    // 获取合约方法
    const Contracts = await new window.WEB3.eth.Contract(
      IPancakePair.abi,
      address,
      provider
    );
    // 获取getReserves
    let result = await Contracts.methods
      .getReserves()
      .call()
      .then((res) => {
        return res;
      });
    const balances = TOKEN1.sortsBefore(TOKEN2)
      ? [result.reserve0, result.reserve1]
      : [result.reserve1, result.reserve0];
    let pair = new Pair(
      new TokenAmount(TOKEN1, balances[0]),
      new TokenAmount(TOKEN2, balances[1])
    );
    const route = new Route([pair], TOKEN1);
    if (token1 === "WBTC") {
      return route.midPrice.toSignificant(6) / 10000000000;
    }
    console.log(route.midPrice.toSignificant(6));

    return route.midPrice.toSignificant(6);
  } catch (error) {
    return 0;
  }
};
