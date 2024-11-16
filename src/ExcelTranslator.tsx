/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";
import * as XLSX from "xlsx";

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

const TranslateExcel2 = () => {
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<any>([]);
  const [targetLang, setTargetLang] = useState("en");
  const [columns, setColumns] = useState<any>([]);
  const [selectedColumns, setSelectedColumns] = useState<any>([]);
  const [sheets, setSheets] = useState<any>([]);
  const [selectedSheets, setSelectedSheets] = useState<any>([]);

  //#region ParseExcelFile
  const parseExcelContent = (content: any) => {
    const workbook = XLSX.read(content, { type: "binary" });
    const sheetNames = workbook.SheetNames;
    const parsedSheets: any = {};

    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const { headers, data } = parseCellData(worksheet);
      parsedSheets[sheetName] = { headers, data };
    }

    return parsedSheets;
  };

  const parseCellData = (worksheet: any) => {
    const headers: string[] = [];
    const data: any[] = [];

    for (
      let row = 1;
      row <= worksheet["!ref"].split(":")[1].match(/\d+/)[0];
      row++
    ) {
      const rowData: any = {};
      let columnIndex = 0;
      let columnLetter = "A";

      while (worksheet[`${columnLetter}${row}`]) {
        const cellValue = worksheet[`${columnLetter}${row}`].v;
        rowData[headers[columnIndex] || `Column${columnIndex + 1}`] = cellValue;
        headers[columnIndex] =
          headers[columnIndex] || `Column${columnIndex + 1}`;
        columnIndex++;
        columnLetter = String.fromCharCode(columnLetter.charCodeAt(0) + 1);
      }

      data.push(rowData);
    }

    return { headers, data };
  };
  //#endregion ParseExcelFile

  //#region Upload
  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file extension
    const extension = file.name.split(".").pop().toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") {
      setError("Please upload an Excel file (xlsx or xls).");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const content = event.target.result;
          const parsedSheets: any = parseExcelContent(content);

          setSheets(Object.keys(parsedSheets));
          setSelectedSheets(Object.keys(parsedSheets));
          setPreviews({ ...parsedSheets });
          setColumns(parsedSheets[Object.keys(parsedSheets)[0]].headers);
          setSelectedColumns(
            parsedSheets[Object.keys(parsedSheets)[0]].headers
          );
          setFileContent(content);
        } catch (err) {
          setError(
            "Error parsing file. Please ensure it's a valid Excel file."
          );
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError("Error reading file.");
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError("Error reading file. Please try again.");
      setLoading(false);
    }
  };
  //#endregion Upload

  //#region Preview
  const getPreview = (sheetName: string) => {
    return previews[sheetName]?.data.slice(0, 10);
  };
  //#endregion Preview

  //#region TranslateAPI
  const translateContent = async () => {
    if (!fileContent || !selectedColumns.length || !selectedSheets.length)
      return;

    try {
      setLoading(true);
      setError("");

      const translatedData: any = {};

      for (const sheet of selectedSheets) {
        const { headers, data } = parseExcelContent(fileContent)[sheet];

        const translatedRows = [];
        for (const row of data) {
          const newRow: any = { ...row };
          for (const col of selectedColumns) {
            const text = row[col];

            // Make a request to the backend to use Azure OpenAI for translation
            try {
              const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_BASE_URL}/api/translate`,
                {
                  text,
                  targetLang,
                },
                {
                  headers: {
                    "Content-Type": "application/json;charset=UTF-8",
                    Accept: "application/json;charset=UTF-8",
                  },
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
          translatedRows.push(newRow);
        }

        translatedData[sheet] = {
          headers: headers.map((header: any) => `${header}_${targetLang}`),
          data: translatedRows,
        };
      }

      // Create the Excel file and download it
      const workbook = XLSX.utils.book_new();
      for (const [sheet, { headers, data }] of Object.entries(translatedData)) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet);
      }
      const excelData = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      downloadTranslatedFile(excelData);
    } catch (err) {
      setError("Error during translation. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  //#endregion TranslateAPI

  //#region Download
  const downloadTranslatedFile = (content: any) => {
    // Add BOM(Byte Order Mark) for UTF-8
    const BOM = "\uFEFF";
    const contentWithBOM = BOM + content;

    // Create blob with UTF-8 encoding
    const blob = new Blob([contentWithBOM], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translated_file_${targetLang}.xlsx`;

    // Trigger download
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };
  //#endregion Download

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Excel Translator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Upload Excel File</label>
          <input
            type="file"
            accept=".xlsx,.xls"
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

        {/* Sheet Selection */}
        {sheets.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Select Sheets to Translate
            </label>
            <div className="flex flex-wrap gap-2">
              {sheets.map((sheet: any) => (
                <label key={sheet} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedSheets.includes(sheet)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSheets([sheet]);
                        setColumns(previews[sheet]?.headers);
                        setSelectedColumns(previews[sheet]?.headers);
                      } else {
                        setSelectedSheets([]);
                        setColumns([]);
                        setSelectedColumns([]);
                      }
                    }}
                    className="mr-1"
                  />
                  <span className="text-sm">{sheet}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Column Selection */}
        {columns.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Select Columns to Translate
            </label>
            <div className="flex flex-wrap gap-2">
              {columns.map((col: any) => (
                <label key={col} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, col]);
                      } else {
                        setSelectedColumns(
                          selectedColumns.filter((c: any) => c !== col)
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

        {/* Previews */}
        {selectedSheets.map((sheet: any) => (
          <div key={sheet} className="space-y-2">
            <h3 className="text-sm font-medium">Preview for {sheet}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {previews[sheet]?.headers.map((col: any) => (
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
                  {getPreview(sheet)?.map((row: any, idx: any) => (
                    <tr key={idx}>
                      {Object.values(row).map((value: any, colIdx) => (
                        <td key={colIdx} className="px-4 py-2 text-sm">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Translate Button */}
        <Button
          onClick={translateContent}
          disabled={
            loading ||
            !fileContent ||
            !selectedColumns.length ||
            !selectedSheets.length
          }
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

export default TranslateExcel2;
