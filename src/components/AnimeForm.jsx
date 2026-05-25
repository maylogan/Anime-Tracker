import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useAnimeStore } from "../store/store";
import { RatingStars, Badge, WarningDialog } from "./Common";
import { searchAnime, formatAnimeForEntry } from "../services/jikanAPI";
import { useDebounce } from "../hooks/useCustom";
import { parseAnimeImportFile } from "../services/bulkImport";

const POSTER_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'>
    <rect width='100%' height='100%' fill='%23212b34' />
    <text x='50%' y='50%' font-size='14' fill='%238a98a6' text-anchor='middle' dominant-baseline='middle' font-family='Arial, Helvetica, sans-serif'>No Image</text>
  </svg>`,
)} `;

export const AnimeFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  bulkMode = false,
  onSubmitMany,
}) => {
  const normalizedInitialStatus =
    initialData?.status === "Plan to Watch"
      ? "Planned"
      : initialData?.status || "Completed";
  const normalizeAudience = (val) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    if (Number.isNaN(num)) return null;
    return num > 10 ? num / 10 : num;
  };
  const [title, setTitle] = useState(initialData?.title || "");
  const [posterUrl, setPosterUrl] = useState(initialData?.poster_url || "");
  const [categories, setCategories] = useState(initialData?.categories || []);
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [audienceRating, setAudienceRating] = useState(
    normalizeAudience(initialData?.audience_rating || null),
  );
  const [status, setStatus] = useState(normalizedInitialStatus);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [episodes, setEpisodes] = useState(initialData?.episodes || "");
  const [releaseDate, setReleaseDate] = useState(
    initialData?.release_date || "",
  );
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBulkAnime, setSelectedBulkAnime] = useState([]);
  const [bulkSelectionSnapshot, setBulkSelectionSnapshot] = useState([]);
  const [bulkStage, setBulkStage] = useState("select");
  const [bulkDrafts, setBulkDrafts] = useState([]);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState(0);
  const [bulkImportName, setBulkImportName] = useState("");
  const [bulkImportSource, setBulkImportSource] = useState("selection");
  const [isBulkAdvancing, setIsBulkAdvancing] = useState(false);
  const [isBulkCancelConfirmOpen, setIsBulkCancelConfirmOpen] = useState(false);
  const [warningDialog, setWarningDialog] = useState({
    isOpen: false,
    title: "Warning",
    message: "",
  });
  const bulkFileInputRef = useRef(null);
  const bulkAdvanceModeRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const getBulkIdentity = (item) => {
    if (!item) return "";

    const source = item.source || item;
    if (source.id !== undefined && source.id !== null) return `id:${source.id}`;
    if (source.anime_id !== undefined && source.anime_id !== null) {
      return `anime:${source.anime_id}`;
    }

    const titleValue =
      source.title?.english || source.title?.romaji || source.title || "";
    const normalizedTitle = String(titleValue).trim().toLowerCase();
    return normalizedTitle ? `title:${normalizedTitle}` : "";
  };

  const toBulkFormattedAnime = (anime) => {
    if (!anime) {
      return {
        anime_id: null,
        title: "",
        poster_url: "",
        categories: [],
        episodes: "",
        release_date: "",
        audience_rating: null,
      };
    }

    // Imported rows already match the draft shape.
    if (typeof anime.title === "string") {
      return {
        anime_id: anime.anime_id ?? anime.id ?? null,
        title: anime.title,
        poster_url: anime.poster_url || "",
        categories: anime.categories || [],
        episodes: anime.episodes ? String(anime.episodes) : "",
        release_date: anime.release_date || "",
        audience_rating: anime.audience_rating ?? null,
      };
    }

    return formatAnimeForEntry(anime);
  };

  const openWarningDialog = ({ title = "Warning", message }) => {
    setWarningDialog({
      isOpen: true,
      title,
      message,
    });
  };

  // Reset form when modal opens/closes or when initialData changes
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "");
      setPosterUrl(initialData?.poster_url || "");
      setCategories(initialData?.categories || []);
      setRating(initialData?.rating || 0);
      setAudienceRating(
        normalizeAudience(initialData?.audience_rating || null),
      );
      setStatus(normalizedInitialStatus);
      setNotes(initialData?.notes || "");
      setEpisodes(initialData?.episodes || "");
      setReleaseDate(initialData?.release_date || "");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedBulkAnime([]);
      setBulkSelectionSnapshot([]);
      setBulkStage("select");
      setBulkDrafts([]);
      setBulkCurrentIndex(0);
      setBulkImportName("");
      setIsBulkCancelConfirmOpen(false);
      setWarningDialog({ isOpen: false, title: "Warning", message: "" });
    }
  }, [isOpen, initialData, bulkMode]);

  useEffect(() => {
    if (debouncedSearch.length > 0) {
      const performSearch = async () => {
        setIsSearching(true);
        const results = await searchAnime(debouncedSearch);
        setSearchResults(results);
        setIsSearching(false);
      };
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const handleSelectAnime = (anime) => {
    if (bulkMode) {
      console.log(
        "Toggling bulk select for:",
        anime.id,
        anime.title?.english || anime.title?.romaji,
      );
      setSelectedBulkAnime((current) => {
        const targetIdentity = getBulkIdentity(anime);
        const exists = current.some(
          (item) => getBulkIdentity(item) === targetIdentity,
        );
        const nextSelection = exists
          ? current.filter((item) => getBulkIdentity(item) !== targetIdentity)
          : [...current, anime];

        if (bulkStage === "select") {
          setBulkSelectionSnapshot(nextSelection.map((item) => ({ ...item })));
        }

        return nextSelection;
      });
      return;
    }

    const formatted = formatAnimeForEntry(anime);
    setTitle(formatted.title);
    setPosterUrl(formatted.poster_url);
    setCategories(formatted.categories);
    setEpisodes(formatted.episodes ? formatted.episodes.toString() : "");
    setReleaseDate(formatted.release_date || "");
    setAudienceRating(normalizeAudience(formatted.audience_rating || null));
    setSearchQuery("");
    setSearchResults([]);
  };

  const toggleBulkAnime = (anime) => {
    setSelectedBulkAnime((current) => {
      const targetIdentity = getBulkIdentity(anime);
      const exists = current.some(
        (item) => getBulkIdentity(item) === targetIdentity,
      );
      const nextSelection = exists
        ? current.filter((item) => getBulkIdentity(item) !== targetIdentity)
        : [...current, anime];

      if (bulkStage === "select") {
        setBulkSelectionSnapshot(nextSelection.map((item) => ({ ...item })));
      }

      return nextSelection;
    });
  };

  const createBulkDraft = ({
    source = null,
    formattedAnime,
    overrides = {},
    importSource = "selection",
  }) => ({
    source,
    importSource,
    anime_id:
      overrides.anime_id ?? formattedAnime.anime_id ?? source?.id ?? null,
    title: overrides.title ?? formattedAnime.title,
    poster_url: overrides.poster_url ?? formattedAnime.poster_url,
    categories: overrides.categories ?? formattedAnime.categories ?? [],
    episodes:
      overrides.episodes ??
      (formattedAnime.episodes ? String(formattedAnime.episodes) : ""),
    release_date: overrides.release_date ?? formattedAnime.release_date ?? "",
    rating: overrides.rating ?? rating,
    status: overrides.status ?? status,
    notes: overrides.notes ?? notes,
    audience_rating:
      overrides.audience_rating ?? formattedAnime.audience_rating ?? null,
  });

  const buildBulkDrafts = (existingDrafts = []) => {
    const draftByIdentity = new Map(
      existingDrafts.map((draft) => [getBulkIdentity(draft), draft]),
    );

    return selectedBulkAnime.map((anime) => {
      const formattedAnime = toBulkFormattedAnime(anime);
      const identity = getBulkIdentity(anime);
      const existingDraft = draftByIdentity.get(identity);

      if (!existingDraft) {
        return createBulkDraft({
          source: anime,
          formattedAnime,
        });
      }

      return createBulkDraft({
        source: anime,
        formattedAnime,
        overrides: {
          anime_id: existingDraft.anime_id,
          title: existingDraft.title,
          poster_url: existingDraft.poster_url,
          categories: existingDraft.categories,
          episodes: existingDraft.episodes,
          release_date: existingDraft.release_date,
          rating: existingDraft.rating,
          status: existingDraft.status,
          notes: existingDraft.notes,
          audience_rating: existingDraft.audience_rating,
        },
      });
    });
  };

  const currentBulkDraft = bulkDrafts[bulkCurrentIndex] || null;
  const isBulkEditing = bulkMode && bulkStage === "edit";
  const [posterLoadingIndex, setPosterLoadingIndex] = useState(null);

  // If a bulk draft doesn't have a poster, attempt a lightweight search to fetch one
  useEffect(() => {
    let cancelled = false;
    const tryFetchPoster = async () => {
      if (!isBulkEditing || !currentBulkDraft) return;
      if (currentBulkDraft.poster_url) return;
      setPosterLoadingIndex(bulkCurrentIndex);

      const titleToSearch =
        currentBulkDraft.title ||
        currentBulkDraft.source?.title?.english ||
        currentBulkDraft.source?.title?.romaji;
      if (!titleToSearch) {
        setPosterLoadingIndex(null);
        return;
      }

      try {
        console.log("Bulk poster lookup for:", titleToSearch);
        const results = await searchAnime(titleToSearch);
        console.log("Poster lookup results count:", results?.length);
        if (cancelled) return;
        const first = results?.[0];
        if (first) {
          const formatted = formatAnimeForEntry(first);
          console.log("Selected poster:", formatted.poster_url);
          updateCurrentBulkDraft({
            poster_url: formatted.poster_url || "",
            categories:
              formatted.categories && formatted.categories.length > 0
                ? formatted.categories
                : currentBulkDraft.categories,
            audience_rating:
              formatted.audience_rating ?? currentBulkDraft.audience_rating,
            episodes:
              currentBulkDraft.episodes ||
              (formatted.episodes ? String(formatted.episodes) : ""),
            release_date:
              currentBulkDraft.release_date || formatted.release_date || "",
          });
        }
      } catch (err) {
        // ignore poster lookup failures
      } finally {
        setPosterLoadingIndex(null);
      }
    };

    tryFetchPoster();
    return () => {
      cancelled = true;
    };
  }, [
    bulkCurrentIndex,
    isBulkEditing,
    currentBulkDraft?.title,
    currentBulkDraft?.poster_url,
  ]);
  const updateBulkDraftAtIndex = (targetIndex, patch) => {
    if (patch.poster_url)
      console.log(
        "updateCurrentBulkDraft: set poster_url ->",
        patch.poster_url,
      );
    setBulkDrafts((current) =>
      current.map((draft, index) =>
        index === targetIndex ? { ...draft, ...patch } : draft,
      ),
    );
  };

  const updateCurrentBulkDraft = (patch) => {
    updateBulkDraftAtIndex(bulkCurrentIndex, patch);
  };

  const startBulkStepper = (
    drafts,
    importName = "",
    selectionSnapshot = [],
    startIndex = 0,
    importSource = "selection",
  ) => {
    if (!drafts || drafts.length === 0) {
      openWarningDialog({
        message: "Please select at least one anime to add.",
      });
      return;
    }

    console.log(
      "Starting bulk stepper with drafts:",
      drafts.map((d) => ({ title: d.title, poster: d.poster_url })),
    );
    setBulkDrafts(drafts);
    setBulkSelectionSnapshot(selectionSnapshot);
    setBulkCurrentIndex(
      Math.min(Math.max(0, startIndex), Math.max(0, drafts.length - 1)),
    );
    setBulkStage("edit");
    setSearchResults([]);
    setBulkImportName(importName);
    setBulkImportSource(importSource);
  };

  const handleImportBulkFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const fileText = await file.text();
      const importedDrafts = parseAnimeImportFile(fileText, file.name);

      if (importedDrafts.length === 0) {
        openWarningDialog({
          title: "Import Issue",
          message:
            "That file didn't contain any usable rows. Use a TXT file with a title column, or one anime title per line.",
        });
        return;
      }

      startBulkStepper(
        importedDrafts,
        file.name,
        importedDrafts.map((draft) => draft.source || draft),
        0,
        "txt",
      );
    } catch (error) {
      console.error("Bulk import error:", error);
      openWarningDialog({
        title: "Import Issue",
        message: "Could not read that file: " + error.message,
      });
    }
  };

  const triggerBulkFilePicker = () => {
    bulkFileInputRef.current?.click();
  };

  const finalizeBulkStepper = async () => {
    if (bulkDrafts.length === 0) {
      openWarningDialog({
        message: "Please select at least one anime to add.",
      });
      return;
    }

    const bulkEntries = bulkDrafts.map((draft, index) => ({
      anime_id: draft.anime_id ?? draft.source?.id ?? Date.now() + index,
      title:
        draft.title ||
        draft.source?.title?.english ||
        draft.source?.title?.romaji ||
        "Unknown",
      poster_url: draft.poster_url || "",
      categories: draft.categories || [],
      rating: draft.rating,
      audience_rating:
        draft.audience_rating === null || draft.audience_rating === undefined
          ? null
          : Math.round(Number(draft.audience_rating) * 10),
      status: draft.status,
      notes: draft.notes,
      episodes: draft.episodes ? parseInt(draft.episodes, 10) : null,
      release_date: draft.release_date || null,
    }));

    await onSubmitMany?.(bulkEntries);
  };

  const goToPreviousBulkDraft = () => {
    setBulkCurrentIndex((current) => Math.max(0, current - 1));
  };

  const returnToBulkSelection = () => {
    if (bulkImportSource === "txt") return;

    const restoredSelection =
      bulkDrafts.length > 0
        ? bulkDrafts.map((draft) => ({ ...(draft.source || draft) }))
        : bulkSelectionSnapshot.map((item) => ({ ...item }));

    setSelectedBulkAnime(restoredSelection);
    setBulkSelectionSnapshot(restoredSelection.map((item) => ({ ...item })));
    setBulkStage("select");
    setSearchResults([]);
    setSearchQuery("");
  };

  const removeCurrentBulkDraft = () => {
    if (!currentBulkDraft) return;

    const nextDrafts = bulkDrafts.filter(
      (_, index) => index !== bulkCurrentIndex,
    );
    const nextSelection = selectedBulkAnime.filter(
      (_, index) => index !== bulkCurrentIndex,
    );

    setBulkDrafts(nextDrafts);
    setSelectedBulkAnime(nextSelection);
    setBulkSelectionSnapshot(nextSelection.map((item) => ({ ...item })));

    if (nextDrafts.length === 0) {
      setBulkCurrentIndex(0);
      setBulkStage("select");
      setBulkImportName("");
      setBulkImportSource("selection");
      setSearchResults([]);
      setSearchQuery("");
      return;
    }

    setBulkCurrentIndex((current) => Math.min(current, nextDrafts.length - 1));
  };

  const goToNextBulkDraft = async () => {
    if (isBulkAdvancing) return;
    if (!currentBulkDraft) return;

    setIsBulkAdvancing(true);

    if (bulkCurrentIndex >= bulkDrafts.length - 1) {
      bulkAdvanceModeRef.current = "finalize";
      try {
        await finalizeBulkStepper();
      } finally {
        bulkAdvanceModeRef.current = null;
        setIsBulkAdvancing(false);
      }
      return;
    }

    bulkAdvanceModeRef.current = "advance";
    setBulkCurrentIndex((current) =>
      Math.min(bulkDrafts.length - 1, current + 1),
    );
  };

  const continueBulkFromSelection = () => {
    const rebuiltDrafts = buildBulkDrafts(bulkDrafts);
    const currentIdentity = getBulkIdentity(currentBulkDraft);
    const resumeIndex = rebuiltDrafts.findIndex(
      (draft) => getBulkIdentity(draft) === currentIdentity,
    );

    startBulkStepper(
      rebuiltDrafts,
      bulkImportName,
      [...selectedBulkAnime],
      resumeIndex >= 0
        ? resumeIndex
        : Math.min(bulkCurrentIndex, Math.max(0, rebuiltDrafts.length - 1)),
      bulkImportSource,
    );
  };

  const handleAddCategory = (category) => {
    if (!categories.includes(category)) {
      setCategories([...categories, category]);
    }
  };

  const handleRemoveCategory = (category) => {
    setCategories(categories.filter((c) => c !== category));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (bulkMode) {
      if (bulkStage === "select") {
        continueBulkFromSelection();
        return;
      }

      try {
        await goToNextBulkDraft();
      } catch (error) {
        console.error("Bulk submission error:", error);
        openWarningDialog({
          message: "Error adding anime: " + error.message,
        });
      } finally {
        if (bulkAdvanceModeRef.current === "advance") {
          bulkAdvanceModeRef.current = null;
          setIsBulkAdvancing(false);
        }
      }

      return;
    }

    if (!title.trim()) {
      openWarningDialog({
        message: "Please enter an anime title.",
      });
      return;
    }

    try {
      // Convert audience rating to SMALLINT tenths for DB (e.g., 8.7 -> 87)
      const audience_payload =
        audienceRating === null || audienceRating === undefined
          ? null
          : Math.round(Number(audienceRating) * 10);

      await onSubmit({
        title,
        poster_url: posterUrl,
        categories,
        rating,
        audience_rating: audience_payload,
        status,
        notes,
        episodes: episodes ? parseInt(episodes) : null,
        release_date: releaseDate || null,
      });
    } catch (error) {
      console.error("Form submission error:", error);
      openWarningDialog({
        message: "Error adding anime: " + error.message,
      });
    }
  };

  useEffect(() => {
    if (bulkAdvanceModeRef.current === "advance") {
      bulkAdvanceModeRef.current = null;
      setIsBulkAdvancing(false);
    }
  }, [bulkCurrentIndex]);

  useEffect(() => {
    let cancelled = false;
    const draftIndex = bulkCurrentIndex;
    const draftAtStart = currentBulkDraft;
    const tryFetchPoster = async () => {
      if (!isBulkEditing || !draftAtStart) return;
      if (draftAtStart.poster_url) return;
      setPosterLoadingIndex(draftIndex);

      const titleToSearch =
        draftAtStart.title ||
        draftAtStart.source?.title?.english ||
        draftAtStart.source?.title?.romaji;
      if (!titleToSearch) {
        setPosterLoadingIndex(null);
        return;
      }

      try {
        console.log("Bulk poster lookup for:", titleToSearch);
        const results = await searchAnime(titleToSearch);
        console.log("Poster lookup results count:", results?.length);
        if (cancelled) return;
        const first = results?.[0];
        if (first) {
          const formatted = formatAnimeForEntry(first);
          console.log("Selected poster:", formatted.poster_url);
          updateBulkDraftAtIndex(draftIndex, {
            poster_url: formatted.poster_url || "",
            categories:
              formatted.categories && formatted.categories.length > 0
                ? formatted.categories
                : draftAtStart.categories,
            audience_rating:
              formatted.audience_rating ?? draftAtStart.audience_rating,
            episodes:
              draftAtStart.episodes ||
              (formatted.episodes ? String(formatted.episodes) : ""),
            release_date:
              draftAtStart.release_date || formatted.release_date || "",
          });
        }
      } catch (err) {
        // ignore poster lookup failures
      } finally {
        setPosterLoadingIndex(null);
      }
    };

    tryFetchPoster();
    return () => {
      cancelled = true;
    };
  }, [
    bulkCurrentIndex,
    isBulkEditing,
    currentBulkDraft?.title,
    currentBulkDraft?.poster_url,
    currentBulkDraft?.importSource,
  ]);

  const canReturnToSelection =
    bulkMode && bulkStage === "edit" && bulkImportSource !== "txt";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-700 shadow-2xl"
      >
        <div className="sticky top-0 z-20 bg-dark-800 border-b border-dark-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-dark-50">
            {bulkMode
              ? "Bulk Add Anime"
              : initialData
                ? "Edit Anime"
                : "Add New Anime"}
          </h2>
          <button
            onClick={onClose}
            className="text-3xl text-dark-400 hover:text-accent-blue transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            {bulkMode && bulkStage === "edit" ? (
              <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-4 text-sm text-dark-300">
                <p className="font-semibold text-dark-50">
                  {selectedBulkAnime.length} anime selected
                </p>
                <p className="mt-1">
                  Use Back to selection if you want to add or remove titles.
                </p>
              </div>
            ) : (
              <>
                <label className="block text-sm font-semibold mb-2 text-accent-blue">
                  {bulkMode ? "Search Anime to Add" : "Search Anime (Optional)"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={bulkMode && bulkStage === "edit"}
                    placeholder={
                      bulkMode
                        ? "Search and select multiple anime..."
                        : "Search from MyAnimeList..."
                    }
                    className={`w-full rounded-lg border px-4 py-2 pr-10 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors ${bulkMode && bulkStage === "edit" ? "cursor-not-allowed border-dark-700 bg-dark-800 opacity-70" : "border-dark-600 bg-dark-700"}`}
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 transition-colors hover:text-dark-100"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {bulkMode &&
                bulkStage === "select" &&
                selectedBulkAnime.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-dark-700 bg-dark-900/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent-blue">
                      Selected
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedBulkAnime.map((anime) => (
                        <button
                          key={getBulkIdentity(anime)}
                          type="button"
                          onClick={() => toggleBulkAnime(anime)}
                          className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-xs font-semibold text-accent-blue transition-colors hover:border-accent-blue"
                        >
                          {anime.title?.english ||
                            anime.title?.romaji ||
                            "Unknown"}{" "}
                          ×
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {bulkMode && bulkStage === "select" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      ref={bulkFileInputRef}
                      type="file"
                      accept=".txt,text/plain"
                      onChange={handleImportBulkFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={triggerBulkFilePicker}
                      className="rounded-xl border border-dark-700 bg-dark-800 px-4 py-2 text-sm font-semibold text-dark-50 transition-colors hover:border-accent-blue hover:text-accent-blue"
                    >
                      Import TXT
                    </button>
                    <p className="text-xs text-dark-400">
                      TXT should be one anime title per line. Extra folder,
                      episode, or genre text is ignored.
                    </p>
                  </div>
                ) : null}

                {bulkStage === "select" && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 space-y-2 max-h-64 overflow-y-auto"
                  >
                    {searchResults.map((anime) => (
                      <button
                        key={anime.id}
                        type="button"
                        onClick={() => handleSelectAnime(anime)}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex gap-3 ${bulkMode && selectedBulkAnime.some((item) => getBulkIdentity(item) === getBulkIdentity(anime)) ? "bg-accent-blue/15 border border-accent-blue" : "bg-dark-700 hover:bg-dark-600"}`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={
                              anime.coverImage?.extraLarge ||
                              anime.coverImage?.large
                            }
                            alt={anime.title?.english || anime.title?.romaji}
                            className="w-12 h-16 object-cover rounded border border-dark-600"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = POSTER_PLACEHOLDER;
                            }}
                          />
                          {bulkMode &&
                          selectedBulkAnime.some((item) => {
                            return (
                              getBulkIdentity(item) === getBulkIdentity(anime)
                            );
                          }) ? (
                            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/35 text-sm font-bold text-white">
                              ✓
                            </div>
                          ) : null}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-dark-50">
                            {anime.title?.english || anime.title?.romaji}
                          </p>
                          <p className="text-dark-400 text-xs">
                            {anime.genres?.join(", ")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}

                {bulkStage === "select" && isSearching ? (
                  <p className="text-dark-400 mt-2">Searching...</p>
                ) : null}
              </>
            )}
          </div>

          {bulkMode ? (
            bulkStage === "select" ? (
              <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-4 text-sm text-dark-300">
                <p className="font-semibold text-dark-50">Bulk add mode</p>
                <p className="mt-1">
                  Pick a bunch of anime first, then step through each one to set
                  its status, rating, and notes.
                </p>
              </div>
            ) : currentBulkDraft ? (
              <div className="space-y-6">
                {bulkImportName ? (
                  <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-3 text-sm text-dark-300">
                    Imported from{" "}
                    <span className="font-semibold text-dark-50">
                      {bulkImportName}
                    </span>
                  </div>
                ) : null}
                <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {currentBulkDraft.poster_url ? (
                        <img
                          src={currentBulkDraft.poster_url}
                          alt={currentBulkDraft.title}
                          className="h-28 w-20 rounded-lg object-cover border border-dark-700"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = POSTER_PLACEHOLDER;
                          }}
                        />
                      ) : (
                        <img
                          src={POSTER_PLACEHOLDER}
                          alt="No poster"
                          className="h-28 w-20 rounded-lg object-cover border border-dark-700"
                        />
                      )}
                      {posterLoadingIndex === bulkCurrentIndex && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                          <div className="loader h-6 w-6 border-2 border-t-transparent border-white rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent-blue">
                        Item {bulkCurrentIndex + 1} of {bulkDrafts.length}
                      </p>
                      <div className="mt-1 flex items-start justify-between gap-3">
                        <h3 className="text-xl font-bold text-dark-50">
                          {currentBulkDraft.title}
                        </h3>
                        {bulkImportSource === "txt" ? (
                          <button
                            type="button"
                            onClick={removeCurrentBulkDraft}
                            className="shrink-0 rounded-full border border-rose-500/30 bg-rose-500/10 p-2 text-rose-200 transition-colors hover:border-rose-400 hover:bg-rose-500/20 hover:text-rose-100"
                            aria-label="Skip this anime"
                            title="Skip this anime"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-dark-400">
                        {currentBulkDraft.categories?.length > 0
                          ? currentBulkDraft.categories.join(", ")
                          : "No categories found"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-accent-blue">
                    Your Rating
                  </label>
                  <RatingStars
                    rating={currentBulkDraft.rating}
                    onChange={(value) =>
                      updateCurrentBulkDraft({ rating: value })
                    }
                    interactive
                    size="lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-accent-blue">
                    Status
                  </label>
                  <select
                    value={currentBulkDraft.status}
                    onChange={(e) =>
                      updateCurrentBulkDraft({ status: e.target.value })
                    }
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 focus:outline-none focus:border-accent-blue transition-colors"
                  >
                    <option>Watching</option>
                    <option>Completed</option>
                    <option>Planned</option>
                    <option>On Hold</option>
                    <option>Dropped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-accent-blue">
                    Notes
                  </label>
                  <textarea
                    value={currentBulkDraft.notes}
                    onChange={(e) =>
                      updateCurrentBulkDraft({ notes: e.target.value })
                    }
                    placeholder="Personal notes about this anime..."
                    rows="3"
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-accent-blue">
                      Episodes
                    </label>
                    <input
                      type="number"
                      value={currentBulkDraft.episodes}
                      onChange={(e) =>
                        updateCurrentBulkDraft({ episodes: e.target.value })
                      }
                      placeholder="Number of episodes"
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-accent-blue">
                      Release Date
                    </label>
                    <input
                      type="date"
                      value={currentBulkDraft.release_date}
                      onChange={(e) =>
                        updateCurrentBulkDraft({ release_date: e.target.value })
                      }
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 focus:outline-none focus:border-accent-blue transition-colors"
                    />
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2 text-accent-blue">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Anime title"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-accent-blue">
                  Poster URL
                </label>
                <input
                  type="url"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
                />
                {posterUrl && (
                  <img
                    src={posterUrl}
                    alt="Preview"
                    className="mt-3 h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = POSTER_PLACEHOLDER;
                    }}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-accent-blue">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.map((cat) => (
                    <Badge key={cat} text={cat} color="cyan" />
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add category (e.g., Romance, Action)"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-accent-blue">
                  Your Rating
                </label>
                <RatingStars
                  rating={rating}
                  onChange={setRating}
                  interactive
                  size="lg"
                />
                {audienceRating ? (
                  <p className="mt-2 text-xs text-dark-400">
                    Audience rating: {audienceRating}/10
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-accent-blue">
                    Episodes
                  </label>
                  <input
                    type="number"
                    value={episodes}
                    onChange={(e) => setEpisodes(e.target.value)}
                    placeholder="Number of episodes"
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-accent-blue">
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 focus:outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-accent-blue">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 focus:outline-none focus:border-accent-blue transition-colors"
                >
                  <option>Watching</option>
                  <option>Completed</option>
                  <option>Planned</option>
                  <option>On Hold</option>
                  <option>Dropped</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-accent-blue">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Personal notes about this anime..."
                  rows="3"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors resize-none"
                />
              </div>
            </>
          )}

          {bulkMode && bulkStage === "edit" ? (
            <div className="flex flex-wrap gap-3 pt-4">
              {canReturnToSelection ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    returnToBulkSelection();
                  }}
                  className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 font-semibold text-cyan-300 transition-colors hover:border-cyan-400 hover:bg-cyan-500/15 hover:text-cyan-200"
                >
                  Back to selection
                </button>
              ) : null}
              <button
                type="button"
                onClick={goToPreviousBulkDraft}
                disabled={bulkCurrentIndex === 0}
                className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 font-semibold text-amber-200 transition-colors hover:border-amber-400 hover:bg-amber-500/15 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextBulkDraft}
                disabled={isBulkAdvancing}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                {bulkCurrentIndex >= bulkDrafts.length - 1
                  ? "Add All"
                  : "Save & Next"}
              </button>
              <button
                type="button"
                onClick={() => setIsBulkCancelConfirmOpen(true)}
                className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-semibold text-rose-200 transition-colors hover:border-rose-400 hover:bg-rose-500/15 hover:text-rose-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-4">
              <button
                type={bulkMode && bulkStage === "select" ? "button" : "submit"}
                onClick={
                  bulkMode && bulkStage === "select"
                    ? continueBulkFromSelection
                    : undefined
                }
                className="flex-1 btn-primary"
                disabled={bulkMode && selectedBulkAnime.length === 0}
              >
                {bulkMode
                  ? bulkStage === "select"
                    ? `Continue with ${selectedBulkAnime.length} Anime${selectedBulkAnime.length === 1 ? "" : "s"}`
                    : `Add ${selectedBulkAnime.length} Anime${selectedBulkAnime.length === 1 ? "" : "s"}`
                  : initialData
                    ? "Update Anime"
                    : "Add Anime"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </motion.div>

      {isBulkCancelConfirmOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsBulkCancelConfirmOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-dark-50">Cancel bulk add?</h3>
            <p className="mt-2 text-dark-300">
              Are you sure you'd like to cancel bulk add? Your current progress
              will be lost.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setIsBulkCancelConfirmOpen(false)}
                className="flex-1 rounded-xl border border-dark-700 bg-dark-800 px-4 py-2.5 font-semibold text-dark-50 transition-colors hover:border-dark-500 hover:bg-dark-700"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBulkCancelConfirmOpen(false);
                  onClose();
                }}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-rose-500"
              >
                Cancel Bulk Add
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}

      <WarningDialog
        isOpen={warningDialog.isOpen}
        title={warningDialog.title}
        message={warningDialog.message}
        onClose={() =>
          setWarningDialog((current) => ({ ...current, isOpen: false }))
        }
      />
    </div>
  );
};
