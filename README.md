# Track-My-Assets - Server Side

This repository contains the server-side code for the **Track-My-Assets** platform. It is built using Node.js, Express, and MongoDB to provide robust and secure backend support for asset management operations. The server handles CRUD operations, user authentication, and data management using RESTful APIs.

## Features

- **MongoDB Database**: Utilizes MongoDB for efficient data storage and retrieval, ensuring scalability and flexibility in managing asset data.
- **CRUD Operations**: Provides full CRUD (Create, Read, Update, Delete) functionality for managing assets, users, and other data within the application.
- **Secure Authentication**: Implements JSON Web Token (JWT) for secure authentication and authorization, ensuring that only authorized users can perform certain operations.
- **Environment Variables**: Uses `.env` variables to securely manage sensitive information such as database connection strings and JWT secrets.
- **RESTful APIs**: Designed with REST principles to offer a clean and intuitive interface for client-server communication.
- **Error Handling**: Robust error handling to manage unexpected issues and provide clear feedback to the client.
- **Data Validation**: Ensures data integrity by validating inputs using middleware and Mongoose schemas.

## Setup Instructions

### Prerequisites

- **Node.js**: Ensure that Node.js is installed on your machine.
- **MongoDB**: A running instance of MongoDB is required (local or cloud-based, e.g., MongoDB Atlas).
- **Postman** or **cURL**: For testing API endpoints (optional).

### Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/track-my-assets-server.git
    cd track-my-assets-server
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Setup environment variables**:
   - Create a `.env` file in the root of the project.
   - Add the following variables:

    ```env
    PORT=5000
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    ```

4. **Start the server**:
    ```bash
    npm start
    ```

   The server should now be running on `http://localhost:5000`.

### API Endpoints

Below are some of the key API endpoints provided by the server:

#### Authentication
- **POST** `/api/auth/login`: Authenticates a user and returns a JWT token.
- **POST** `/api/auth/register`: Registers a new user and returns a JWT token.

#### Asset Management
- **GET** `/api/assets`: Retrieves a list of all assets.
- **POST** `/api/assets`: Creates a new asset (requires JWT).
- **PUT** `/api/assets/:id`: Updates an existing asset by ID (requires JWT).
- **DELETE** `/api/assets/:id`: Deletes an asset by ID (requires JWT).

#### User Management
- **GET** `/api/users`: Retrieves a list of all users.
- **GET** `/api/users/:id`: Retrieves details of a specific user by ID.
- **PUT** `/api/users/:id`: Updates user details (requires JWT).
- **DELETE** `/api/users/:id`: Deletes a user by ID (requires JWT).

### Security

- **JWT Authentication**: All protected routes require a valid JWT token to be included in the `Authorization` header as a `Bearer` token.
- **Environment Variables**: Sensitive information such as database credentials and JWT secrets are stored in environment variables and not hardcoded into the source code.

### Error Handling

The server includes comprehensive error handling to provide informative error messages and appropriate HTTP status codes for various scenarios such as invalid input, unauthorized access, or resource not found.

### Deployment

To deploy this server to a production environment:

1. Set up your environment variables in the production environment.
2. Use a process manager like **PM2** to run the server continuously:
    ```bash
    npm install -g pm2
    pm2 start server.js
    ```
3. Ensure MongoDB is properly configured and accessible from your production server.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any bug fixes or enhancements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
 client.
Data Validation: Ensures data integrity by validating inputs using middleware and Mongoose schemas.
