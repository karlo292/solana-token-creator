# Solana Token Creator

This project is a web application for creating and managing Solana tokens with mint authority. It provides a user-friendly interface for interacting with the Solana blockchain, including features for creating tokens, airdropping tokens, burning tokens, and viewing a dashboard of token activities.

## Features

- **Authentication**: Secure login using private keys.
- **Token Creation**: Create new tokens on the Solana blockchain.
- **Airdrop**: Distribute tokens to multiple addresses.
- **Burn Tokens**: Burn tokens to reduce supply.
- **Dashboard**: View token activities and balances.
- **Guide**: Step-by-step guide for using the application.

## Prerequisites

- Node.js (v20.17.0)
- npm (Node Package Manager)
- Solana CLI

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/solana-token-creator.git
    cd solana-token-creator
    ```

2. Install the dependencies:
    ```sh
    npm install
    ```

3. Set up environment variables:
    Copy `.example.env` into `.env` file in the root directory and add the required values

4. Start the application:
    ```sh
    npm start
    ```

5. Open your browser and navigate to `http://localhost:3000`.

## Project Structure

- `app.js`: Main application file that sets up middleware and routes.
- `routes/`: Directory containing route handlers for different features.
- `views/`: Directory containing EJS templates for rendering HTML.
- `public/`: Directory for static files (CSS, JS, images).

## Routes

- `/`: Home page.
- `/create`: Create new tokens.
- `/guide`: Guide for using the application.
- `/auth`: Authentication page.
- `/logout`: Logout page.
- `/airdrop`: Airdrop tokens.
- `/tokens`: View tokens.
- `/burn`: Burn tokens.
- `/dashboard`: View dashboard.

## Usage

1. **Authentication**: Navigate to `/auth` to log in using your private key.
2. **Create Tokens**: Navigate to `/create` to create new tokens.
3. **Airdrop Tokens**: Navigate to `/airdrop` to distribute tokens.
4. **Burn Tokens**: Navigate to `/burn` to burn tokens.
5. **Dashboard**: Navigate to `/dashboard` to view token activities.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.