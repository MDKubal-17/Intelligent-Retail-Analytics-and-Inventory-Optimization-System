import { useState } from "react";

const FLASK_API_URL =
  import.meta.env.VITE_FLASK_API_URL ||
  "http://127.0.0.1:5000";


function AIRecommendations() {

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  const askAI = async () => {

    if (!question.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");


    try {

      const response = await fetch(
        `${FLASK_API_URL}/api/ai/inventory-query`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            question:
              question.trim(),
          }),
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          "AI request failed"
        );

      }


      setAnswer(
        data.answer
      );


    } catch (err) {

      console.error(
        "AI ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to connect to AI."
      );


    } finally {

      setLoading(false);

    }

  };


  const exampleQuestions = [

    "Which products should I reorder?",

    "Which products are low in stock?",

    "Which product generated the highest revenue?",

    "What is the most important inventory problem right now?"

  ];


  return (

    <div className="bg-white rounded-xl shadow-md p-6 mt-8">

      {/* HEADER */}

      <div className="flex items-center gap-3 mb-5">

        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">
          🧠
        </div>

        <div>

          <h2 className="text-xl font-bold">
            AI Inventory Intelligence
          </h2>

          <p className="text-sm text-gray-500">
            Ask questions about your retail data
          </p>

        </div>

      </div>


      {/* QUESTION INPUT */}

      <div className="flex gap-3">

        <input

          type="text"

          value={question}

          onChange={(e) =>
            setQuestion(
              e.target.value
            )
          }

          onKeyDown={(e) => {

            if (
              e.key === "Enter"
            ) {
              askAI();
            }

          }}

          placeholder="Ask: Which products should I reorder?"

          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400"

        />


        <button

          onClick={askAI}

          disabled={
            loading ||
            !question.trim()
          }

          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"

        >

          {loading
            ? "Thinking..."
            : "Ask AI"}

        </button>

      </div>


      {/* EXAMPLE QUESTIONS */}

      {!answer &&
        !loading && (

          <div className="mt-4">

            <p className="text-sm text-gray-500 mb-2">
              Try asking:
            </p>

            <div className="flex flex-wrap gap-2">

              {exampleQuestions.map(
                (item, index) => (

                  <button

                    key={index}

                    onClick={() => {

                      setQuestion(
                        item
                      );

                    }}

                    className="text-sm bg-gray-100 hover:bg-blue-50 border border-gray-200 px-3 py-2 rounded-lg text-gray-700"

                  >

                    {item}

                  </button>

                )
              )}

            </div>

          </div>

        )}


      {/* LOADING */}

      {loading && (

        <div className="mt-6 bg-blue-50 rounded-lg p-4">

          <div className="flex items-center gap-3">

            <div className="animate-pulse text-xl">
              🤖
            </div>

            <div>

              <p className="font-semibold text-blue-800">
                AI is analyzing your inventory...
              </p>

              <p className="text-sm text-blue-600">
                Checking inventory and sales data
              </p>

            </div>

          </div>

        </div>

      )}


      {/* ERROR */}

      {error && (

        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">

          <p className="font-semibold text-red-700">
            AI Assistant Error
          </p>

          <p className="text-sm text-red-600 mt-1">
            {error}
          </p>

        </div>

      )}


      {/* AI ANSWER */}

      {answer && (

        <div className="mt-6">

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">

            <div className="flex items-center gap-2 mb-3">

              <span className="text-lg">
                🤖
              </span>

              <span className="font-semibold">
                AI Analysis
              </span>

            </div>


            <div className="text-gray-700 whitespace-pre-line leading-relaxed">

              {answer}

            </div>

          </div>


          <button

            onClick={() => {

              setAnswer("");
              setQuestion("");

            }}

            className="mt-3 text-sm text-blue-600 hover:underline"

          >

            Ask another question →

          </button>

        </div>

      )}

    </div>

  );

}


export default AIRecommendations;
