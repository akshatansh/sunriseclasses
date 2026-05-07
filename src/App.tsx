import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import CoursesPage from './pages/CoursesPage';
import VideosPage from './pages/VideosPage';
import GalleryPage from './pages/GalleryPage';
import SuccessStoriesPage from './pages/SuccessStoriesPage';
import ContactPage from './pages/ContactPage';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import ResultsPage from './pages/ResultsPage';
import AdminResultsPage from './pages/AdminResultsPage';

import YouTubeFamilyPage from './pages/YouTubeFamilyPage';

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen font-sans antialiased flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/success-stories" element={<SuccessStoriesPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/youtube-family" element={<YouTubeFamilyPage />} />
          <Route path="/admin/sunriseclasses" element={<AdminResultsPage />} />
        </Routes>
      </main>
      <Footer />
      {!isAdmin && <FloatingWhatsApp />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
