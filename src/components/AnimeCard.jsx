import { motion } from "framer-motion";
import { Trash2, Edit2 } from "lucide-react";
import { RatingStars, Badge } from "./Common";

export const AnimeCard = ({ anime, onEdit, onDelete }) => {
  const statusColors = {
    Watching: "cyan",
    Completed: "pink",
    "Plan to Watch": "purple",
    Dropped: "pink",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="card-base overflow-hidden group backdrop-blur-sm border border-dark-700 hover:border-accent-blue/50 transition-all duration-300 shadow-lg hover:shadow-accent-blue/20"
    >
      <div className="relative h-72 overflow-hidden bg-gradient-to-br from-dark-700 to-dark-800">
        <img
          src={anime.poster_url}
          alt={anime.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          style={{ imageRendering: "crisp-edges" }}
          onError={(e) => {
            e.target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect fill="%23334155" width="200" height="300"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23cbd5e1" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => onEdit(anime)}
            className="bg-accent-blue hover:bg-blue-600 p-2.5 rounded-lg transition-colors shadow-lg backdrop-blur-sm"
            title="Edit"
          >
            <Edit2 size={18} className="text-white" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => onDelete(anime.id)}
            className="bg-red-600 hover:bg-red-700 p-2.5 rounded-lg transition-colors shadow-lg backdrop-blur-sm"
            title="Delete"
          >
            <Trash2 size={18} className="text-white" />
          </motion.button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-2 text-dark-50 group-hover:text-accent-blue transition-colors duration-300">
          {anime.title}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge
            text={anime.status}
            color={statusColors[anime.status] || "purple"}
          />
          {(anime.categories || []).map((category) => (
            <Badge key={category} text={category} color="cyan" size="sm" />
          ))}
        </div>

        <div className="text-xs text-dark-300 mb-3 space-y-1">
          {anime.episodes && (
            <p>
              <span className="text-dark-400 font-semibold">Episodes:</span>{" "}
              {anime.episodes}
            </p>
          )}
          {anime.release_date && (
            <p>
              <span className="text-dark-400 font-semibold">Released:</span>{" "}
              {new Date(anime.release_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        {anime.notes && (
          <p className="text-dark-400 text-xs line-clamp-2 italic">
            {anime.notes}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export const AnimeCardGrid = ({ anime, onEdit, onDelete }) => {
  if (anime.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-accent-blue/10 border-2 border-accent-blue/30 flex items-center justify-center mb-4 mx-auto">
          <div className="w-8 h-8 rounded-full bg-accent-blue/20"></div>
        </div>
        <p className="text-2xl text-dark-50 font-bold mb-2">No anime found</p>
        <p className="text-dark-400">
          Try adding your first anime or adjusting your filters
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {anime.map((entry) => (
        <AnimeCard
          key={entry.id}
          anime={entry}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
