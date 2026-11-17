// Hook responsável por consumir o contexto de autenticação.

import { useContext } from "react";

import { AuthContext } from "../contexts/authContextValue";

function useAuth() {

    return useContext(AuthContext);

}

export default useAuth;
