import React, { useState, useEffect, useRef } from "react";
import MovieCard from "./Moviecard";
import axios from "axios";
import { useQuery } from "react-query";
import "../../styles/video.css";
import NavbarPage from "./NavBar";
import DeviceLimitModal from "./DeviceLimitModal";
import CustomVideoPlayerPage from "@/components/VideoPlayer/CustomVideoPlayer";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://streamify-o1ga.onrender.com";
const MOVIES_API_URL = `${API_BASE_URL}/api/movies`;

const fetchMovies = async () => {
  const response = await axios.get(MOVIES_API_URL, { withCredentials: true });

  if (response.status >= 200 && response.status < 300) {
    return response.data.movies.map((movie) => ({
      id: movie._id,
      title: movie.title,
      description: movie.description,
      genre: movie.genre,
      resolutions: movie.resolutions,
      poster: movie.poster.url,
    }));
  } else {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
};

export function Main() {
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [moviesByGenre, setMoviesByGenre] = useState({});
  const [showDeviceLimitModal, setShowDeviceLimitModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  const {
    data: movies = [],
    isLoading,
    isError,
    error,
  } = useQuery(
    "movies",
    fetchMovies, {
      onError: (error) => {
        if (error.response?.status === 403) {
          navigate("/suspend");
        }
      },
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
    },
   
  );

  useEffect(() => {
    if (movies.length > 0) {
      const groupedByGenre = movies.reduce((acc, movie) => {
        if (!acc[movie.genre]) {
          acc[movie.genre] = [];
        }
        acc[movie.genre].push(movie);
        return acc;
      }, {});
      setMoviesByGenre(groupedByGenre);
    }
  }, [movies]);
  const handlePlayMovie = async (movie) => {
    setAvailableQualities(
      movie.resolutions?.map((resolution) => resolution.quality)
    );
    setCurrentQuality(movie.resolutions[0]?.quality || null);

    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      return;
    }

    try {
      const qualityUrl = movie.resolutions.find(
        (res) => res.quality === movie.resolutions[0]?.quality
      )?.url;

      if (qualityUrl) {
        const response = await fetch(
          `${API_BASE_URL}/api/keys?movieId=${movie.id}&resolution=${movie.resolutions[0]?.quality}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            credentials: "include",
          }
        );

        const data = await response.json();
        if (data.status === true) {
          setSelectedMovie({
            ...movie,
            src: `${API_BASE_URL}${qualityUrl}`,
          });
        } else {
          if (data.message?.includes("device limit")) {
            setModalMessage(data.message);
            setShowDeviceLimitModal(true);
          }
        }
      }
    } catch (error) {}
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  const handleChangeQuality = (quality) => {
    setCurrentQuality(quality);
  };

  const handleTimeUpdate = (currentTime) => {
    setCurrentTime(currentTime);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"
          aria-hidden="true"
        ></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen text-destructive">
        Error:{" "}
        {error instanceof Error
          ? error.message
          : "An error occurred while loading movies"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavbarPage />

      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/75 z-50"
          aria-hidden="true"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {!selectedMovie && movies.length > 0 && (
        <div className="relative h-[70vh] mb-12">
          <img
            src="https://cdn.shopify.com/s/files/1/1002/7150/files/04_Collection-Banner-Flash-SALE_Posters.jpg?v=1626338687"
            alt={movies[0].title}
            className="w-full h-full object-cover"
          />
          <div className="hero-overlay">
            <div className="absolute bottom-0 left-0 right-0 p-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                {movies[0].title}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl overflow-y-auto h-20">
                {movies[0].description}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="scrollbar-hide overflow-auto">
        <div className="px-6 space-y-12">
          {Object.entries(moviesByGenre).map(([genre, genreMovies]) => (
            <section key={genre}>
              <h2 className="section-title">{genre}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-6 gap-10">
                {genreMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onPlay={handlePlayMovie}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {selectedMovie && (
        <CustomVideoPlayerPage
          src={`${
            selectedMovie.resolutions.find(
              (res) => res.quality === currentQuality
            )?.url
          }`}
          title={selectedMovie.title}
          currentQuality={currentQuality}
          availableQualities={availableQualities}
          handleChangeQuality={handleChangeQuality}
          onClose={() => setSelectedMovie(null)}
          handleTimeUpdate={handleTimeUpdate} // Pass handleTimeUpdate function
        />
      )}

      <DeviceLimitModal
        isOpen={showDeviceLimitModal}
        message={modalMessage}
        onClose={() => setShowDeviceLimitModal(false)}
      />
    </div>
  );
}
