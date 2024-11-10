/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Loader } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import axios from "axios";

const LANGUAGES: any = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
};

const ExcelTranslator = () => {
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState([]);
  const [targetLang, setTargetLang] = useState("en");
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);

  const parseCSVContent = (content: any) => {
    const lines = content.split("\n");
    const headers = lines[0].split(",").map((header: any) => header.trim());
    const data = lines
      .slice(1)
      .map((line: any) => {
        const values = line.split(",");
        return headers.reduce((obj: any, header: any, index: any) => {
          obj[header] = values[index]?.trim() || "";
          return obj;
        }, {});
      })
      .filter((row: any) => Object.values(row).some((value) => value));
    return { headers, data };
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file extension
    const extension = file.name.split(".").pop().toLowerCase();
    if (extension !== "csv") {
      setError("Please upload a CSV file. For Excel files, save as CSV first.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const content = event.target.result;
          const { headers, data } = parseCSVContent(content);

          setColumns(headers);
          console.log("headers :>> ", headers);
          console.log("data :>> ", data);
          setSelectedColumns(headers);
          setPreview(data.slice(0, 10));
          setFileContent(content);
        } catch (err) {
          setError("Error parsing file. Please ensure it's a valid CSV file.");
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError("Error reading file.");
        setLoading(false);
      };

      reader.readAsText(file);
    } catch (err) {
      setError("Error reading file. Please try again.");
      setLoading(false);
    }
  };

  const downloadTranslatedFile = (content: any) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translated_file_${targetLang}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const translateContent = async () => {
    if (!fileContent || !selectedColumns.length) return;

    try {
      setLoading(true);
      setError("");

      const { headers, data } = parseCSVContent(fileContent);

      const translatedData = [];
      for (const row of data) {
        const newRow = { ...row };
        for (const col of selectedColumns) {
          const text = row[col];

          // Make a request to the backend to use Azure OpenAI for translation
          try {
            const response = await axios.post(
              `${process.env.REACT_APP_BACKEND_BASE_URL}/api/translate`,
              {
                text,
                targetLang,
              }
            );
            const translatedText = response.data.translatedText;
            newRow[`${col}_${targetLang}`] = translatedText;
          } catch (error: any) {
            console.error("Translation error:", error);
            setError("Error during translation. Please try again.");
            throw error;
          }
        }
        translatedData.push(newRow);
      }

      const allHeaders = [...headers];
      selectedColumns.forEach((col) => {
        allHeaders.push(`${col}_${targetLang}`);
      });

      const csvContent = [
        allHeaders.join(","),
        ...translatedData.map((row) =>
          allHeaders.map((header) => row[header] || "").join(",")
        ),
      ].join("\n");

      downloadTranslatedFile(csvContent);
    } catch (err) {
      setError("Error during translation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>CSV Translator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Upload CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
          />
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Target Language</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            {Object.entries(LANGUAGES).map(([code, name]: any) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Column Selection */}
        {columns.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Select Columns to Translate
            </label>
            <div className="flex flex-wrap gap-2">
              {columns.map((col) => (
                <label key={col} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, col]);
                      } else {
                        setSelectedColumns(
                          selectedColumns.filter((c) => c !== col)
                        );
                      }
                    }}
                    className="mr-1"
                  />
                  <span className="text-sm">{col}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Preview (First 5 rows)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left text-sm font-medium bg-gray-50"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-2 text-sm">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Translate Button */}
        <Button
          onClick={translateContent}
          disabled={loading || !fileContent || !selectedColumns.length}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            "Translate and Download"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExcelTranslator;
