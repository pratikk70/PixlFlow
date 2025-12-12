"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2,
  Palette,
  Image as ImageIcon,
  Search,
  Download,
  Loader2,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useCanvas } from "@/context/context";
import { FabricImage } from "fabric";

// Unsplash API configuration
const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = "https://api.unsplash.com";

export function BackgroundControls({ project }) {
  const { canvasEditor, processingMessage, setProcessingMessage } = useCanvas();
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [searchQuery, setSearchQuery] = useState("");
  const [unsplashImages, setUnsplashImages] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");

  // Get the main image object from canvas
  const getMainImage = () => {
    if (!canvasEditor) return null;
    const objects = canvasEditor.getObjects();
    return objects.find((obj) => obj.type === "image") || null;
  };

  // AI Background generation
  const handleBackgroundRemovalWithPrompt = async () => {
    const mainImage = getMainImage();
    if (!mainImage || !project || !aiPrompt) return;

    setProcessingMessage("Generating background using AI...");

    try {
      const currentImageUrl = project.currentImageUrl || project.originalImageUrl;

      // ImageKit AI transformation for background replacement
      const aiBackgroundUrl = `${currentImageUrl}?tr=e-retouch,e-ai-bg-replace,ai-bg-prompt-${encodeURIComponent(aiPrompt)}`;

      const newBackground = await FabricImage.fromURL(aiBackgroundUrl, {
        crossOrigin: "anonymous",
      });

      // Keep main image properties
      const currentProps = {
        left: mainImage.left,
        top: mainImage.top,
        scaleX: mainImage.scaleX,
        scaleY: mainImage.scaleY,
        angle: mainImage.angle,
        originX: mainImage.originX,
        originY: mainImage.originY,
      };

      canvasEditor.remove(mainImage);
      newBackground.set(currentProps);
      canvasEditor.add(newBackground);
      newBackground.setCoords();
      canvasEditor.setActiveObject(newBackground);
      canvasEditor.calcOffset();
      canvasEditor.requestRenderAll();

      console.log("AI background applied successfully");
    } catch (error) {
      console.error("Error applying AI background:", error);
      alert("Failed to generate AI background. Please try again.");
    } finally {
      setProcessingMessage(null);
    }
  };

  // Background removal using ImageKit
  const handleBackgroundRemoval = async () => {
    const mainImage = getMainImage();
    if (!mainImage || !project) return;

    setProcessingMessage("Removing background with AI...");

    try {
      const currentImageUrl = project.currentImageUrl || project.originalImageUrl;
      const bgRemovedUrl = currentImageUrl.includes("ik.imagekit.io")
        ? `${currentImageUrl.split("?")[0]}?tr=e-bgremove`
        : currentImageUrl;

      const processedImage = await FabricImage.fromURL(bgRemovedUrl, {
        crossOrigin: "anonymous",
      });

      const currentProps = {
        left: mainImage.left,
        top: mainImage.top,
        scaleX: mainImage.scaleX,
        scaleY: mainImage.scaleY,
        angle: mainImage.angle,
        originX: mainImage.originX,
        originY: mainImage.originY,
      };

      canvasEditor.remove(mainImage);
      processedImage.set(currentProps);
      canvasEditor.add(processedImage);
      processedImage.setCoords();
      canvasEditor.setActiveObject(processedImage);
      canvasEditor.calcOffset();
      canvasEditor.requestRenderAll();

      console.log("Background removed successfully");
    } catch (error) {
      console.error("Error removing background:", error);
      alert("Failed to remove background. Please try again.");
    } finally {
      setProcessingMessage(null);
    }
  };

  // Set canvas background color
  const handleColorBackground = () => {
    if (!canvasEditor) return;
    canvasEditor.backgroundColor = backgroundColor;
    canvasEditor.requestRenderAll();
  };

  // Remove canvas background (both color and image)
  const handleRemoveBackground = () => {
    if (!canvasEditor) return;
    canvasEditor.backgroundColor = null;
    canvasEditor.backgroundImage = null;
    canvasEditor.requestRenderAll();
  };

  // Search Unsplash images
  const searchUnsplashImages = async () => {
    if (!searchQuery.trim() || !UNSPLASH_ACCESS_KEY) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
          searchQuery
        )}&per_page=12`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to search images");

      const data = await response.json();
      setUnsplashImages(data.results || []);
    } catch (error) {
      console.error("Error searching Unsplash:", error);
      alert("Failed to search images. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Set image as canvas background
  const handleImageBackground = async (imageUrl, imageId) => {
    if (!canvasEditor) return;

    setSelectedImageId(imageId);
    try {
      if (UNSPLASH_ACCESS_KEY) {
        fetch(`${UNSPLASH_API_URL}/photos/${imageId}/download`, {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }).catch(() => {});
      }

      const fabricImage = await FabricImage.fromURL(imageUrl, {
        crossOrigin: "anonymous",
      });

      const canvasWidth = project.width;
      const canvasHeight = project.height;

      const scaleX = canvasWidth / fabricImage.width;
      const scaleY = canvasHeight / fabricImage.height;
      const scale = Math.max(scaleX, scaleY);

      fabricImage.set({
        scaleX: scale,
        scaleY: scale,
        originX: "center",
        originY: "center",
        left: canvasWidth / 2,
        top: canvasHeight / 2,
      });

      canvasEditor.backgroundImage = fabricImage;
      canvasEditor.requestRenderAll();
      setSelectedImageId(null);
    } catch (error) {
      console.error("Error setting background image:", error);
      alert("Failed to set background image. Please try again.");
      setSelectedImageId(null);
    }
  };

  // Handle search on Enter key
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      searchUnsplashImages();
    }
  };

  if (!canvasEditor) {
    return (
      <div className="p-4">
        <p className="text-white/70 text-sm">Canvas not ready</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative h-full">
      {/* AI Background Removal Button */}
      <div className="space-y-4 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-sm font-medium text-white mb-2">
            AI Background Removal
          </h3>
          <p className="text-xs text-white/70 mb-4">
            Automatically remove or generate background using AI
          </p>
        </div>

        <Button
          onClick={handleBackgroundRemoval}
          disabled={processingMessage || !getMainImage()}
          className="w-full"
          variant="primary"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove Image Background
        </Button>

        {!getMainImage() && (
          <p className="text-xs text-amber-400">
            Please add an image to the canvas first to remove its background
          </p>
        )}
      </div>

      {/* Tabs for Color and Image */}
      <Tabs defaultValue="color" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
          <TabsTrigger
            value="color"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
          >
            <Palette className="h-4 w-4 mr-2" />
            Color
          </TabsTrigger>
          <TabsTrigger
            value="image"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </TabsTrigger>
        </TabsList>

        {/* Color Background Tab */}
        <TabsContent value="color" className="space-y-4 mt-6">
          <div>
            <h3 className="text-sm font-medium text-white mb-2">
              Solid Color Background
            </h3>
            <p className="text-xs text-white/70 mb-4">
              Choose a solid color for your canvas background
            </p>
          </div>

          <div className="space-y-4">
            <HexColorPicker
              color={backgroundColor}
              onChange={setBackgroundColor}
              style={{ width: "100%" }}
            />

            <div className="flex items-center gap-2">
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#ffffff"
                className="flex-1 bg-slate-700 border-white/20 text-white"
              />
              <div
                className="w-10 h-10 rounded border border-white/20"
                style={{ backgroundColor }}
              />
            </div>

            <Button
              onClick={handleColorBackground}
              className="w-full"
              variant="primary"
            >
              <Palette className="h-4 w-4 mr-2" />
              Apply Color
            </Button>
          </div>
        </TabsContent>

        {/* Image Background Tab */}
        <TabsContent value="image" className="space-y-4 mt-6">
          {/* AI Prompt Input */}
          <div className="mb-2">
            <Input
              placeholder="Enter prompt to generate background using AI"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full bg-slate-700 border-white/20 text-white"
            />
          </div>

          <Button
            onClick={handleBackgroundRemovalWithPrompt}
            disabled={processingMessage || !getMainImage() || !aiPrompt}
            className="w-full mb-4"
            variant="secondary"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Change Background (AI Prompt)
          </Button>

          {/* Unsplash Search Bar */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              placeholder="Search for backgrounds..."
              className="flex-1 bg-slate-700 border-white/20 text-white"
            />
            <Button
              onClick={searchUnsplashImages}
              disabled={isSearching || !searchQuery.trim()}
              variant="primary"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Unsplash Search Results */}
          {unsplashImages?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">
                Search Results ({unsplashImages?.length})
              </h4>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {unsplashImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative group cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:border-cyan-400 transition-colors"
                    onClick={() =>
                      handleImageBackground(image.urls.regular, image.id)
                    }
                  >
                    <img
                      src={image.urls.small}
                      alt={image.alt_description || "Background image"}
                      className="w-full h-24 object-cover"
                    />
                    {selectedImageId === image.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Clear Canvas Background Button */}
      <div className="pt-4 border-t border-white/10 bottom-0 w-full">
        <Button
          onClick={handleRemoveBackground}
          className="w-full"
          variant="outline"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Canvas Background
        </Button>
      </div>
    </div>
  );
}
