# Money Pot

A provably fair, skill-based gaming dApp on EVM where users create and solve USD-funded treasure hunts using a unique authentication challenge.

## About The Project

Money Pot is a visually stunning, provably fair gaming dApp on EVM blockchain. It enables 'Pot Creators' to deposit USD into smart contracts, creating 'treasure hunts' secured by a unique, brain-based authentication challenge. 'Treasure Hunters' pay a small entry fee to attempt to solve the challenge. A successful hunt wins 40% of the pot. The game theory design ensures fairness: creators earn a 50% share of entry fees from successful hunts, incentivizing them to create legitimate, solvable challenges. The frontend provides an immersive, illustrative experience for creating, browsing, and attempting these challenges, complete with seamless EVM wallet integration.

### Key Features

- **Pot Creation:** Users can create new treasure hunt pots with USD deposits, setting a one-letter password and custom challenge configurations.
- **Treasure Hunting:** Browse active pots, pay an entry fee, and attempt to solve the authentication challenge to win a share of the pot.
- **Provably Fair:** Game theory mechanics prevent creator cheating. Honest creators earn from entry fees, while cheaters lose attraction and potential earnings.
- **USD Economy:** Real-money gaming with stablecoin settlements on EVM blockchain.
- **Seamless Wallet Integration:** Connects with popular EVM wallets for smooth on-chain transactions.
- **Visually Stunning UI:** A beautiful, modern interface built with obsessive attention to visual excellence and interactive polish.

## Built With

This project is built with a modern, high-performance tech stack:

- **Frontend:**
  - [React](https://reactjs.org/)
  - [Vite](https://vitejs.dev/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/)
  - [Framer Motion](https://www.framer.com/motion/) for animations
- **Blockchain Integration:**
  - [Viem](https://viem.sh/)
  - [@web3-onboard/react](https://onboard.blocknative.com/)
- **State Management:**
  - [Zustand](https://github.com/pmndrs/zustand)
- **Backend:**
  - [Cloudflare Workers](https://workers.cloudflare.com/)

## Development

To start the development server:

```sh
bun dev
```

The application will launch on `http://localhost:3000` and automatically reload as you make changes.

## Project Structure

- `src/`: Contains all the frontend source code, including pages, components, hooks, and styles.
- `src/pages/`: Main application views/routes.
- `src/components/`: Reusable React components, including shadcn/ui components.
- `src/store/`: Zustand stores for global state management.
- `worker/`: Source code for the Cloudflare Worker backend, handling API requests.
- `public/`: Static assets that are served directly.
