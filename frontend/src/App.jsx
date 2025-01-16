import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import ClientRoutes from "./routes/ClientRoutes";
import AdminRoutes from "./routes/AdminRoutes";
import LoginPage from "./Pages/Client/Login";
import Forget from "./Pages/Client/Forget";
import ResetPassword from "./Pages/Client/ResetPage";
import CreateAccountPage from "./Pages/Client/Create";
import { ProtectedRoute } from "./routes/MainProtected";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Client Routes */}
          {ClientRoutes.map(({ path, element, isProtected }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute element={element} isProtected={isProtected} />
              }
            />
          ))}

          {/* Admin Routes */}
          {AdminRoutes.map(({ path, element, isProtected }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute
                  element={element}
                  isProtected={isProtected}
                  isAdmin
                />
              }
            />
          ))}
               <Route path="/login"
              element={ <LoginPage/>  }/>  
            <Route path="/forget-page"
              element={ <Forget/>  }/> 
            <Route path="/reset-password/:token"
              element={ <ResetPassword/>  }/> 
            <Route path ="/signup"
              element={ <CreateAccountPage/>  }/> 
                </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
