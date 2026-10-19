import json
import os

import boto3


# =========================================================
# DynamoDB
# =========================================================

dynamodb = boto3.resource("dynamodb")

QUESTION_TABLE_NAME = os.environ.get("QUESTION_TABLE")

if not QUESTION_TABLE_NAME:
    raise RuntimeError(
        "QUESTION_TABLE environment variable is not configured."
    )

question_table = dynamodb.Table(QUESTION_TABLE_NAME)


# =========================================================
# Lambda entry point
# =========================================================

def lambda_handler(event, context):

    try:

        # -------------------------------------------------
        # Read query parameters
        #
        # Examples:
        #
        # /question
        #
        # /question?questionId=two-sum
        #
        # /question?questionId=two-sum&language=java
        # -------------------------------------------------

        query_parameters = (
            event.get("queryStringParameters")
            or {}
        )

        question_id = (
            query_parameters.get("questionId")
            or "two-sum"
        )

        language = query_parameters.get("language")

        if language:
            language = language.lower().strip()

        # -------------------------------------------------
        # Get question from DynamoDB
        # -------------------------------------------------

        dynamodb_response = question_table.get_item(
            Key={
                "questionId": question_id
            }
        )

        item = dynamodb_response.get("Item")

        if not item:

            return response(
                404,
                {
                    "success": False,
                    "error": (
                        f"Question '{question_id}' "
                        "was not found."
                    )
                }
            )

        # -------------------------------------------------
        # Supported languages
        # -------------------------------------------------

        supported_languages = item.get(
            "languages",
            []
        )

        # -------------------------------------------------
        # If a language was requested, validate it
        # -------------------------------------------------

        if language:

            if language not in supported_languages:

                return response(
                    400,
                    {
                        "success": False,
                        "error": (
                            f"Language '{language}' "
                            f"is not supported for "
                            f"question '{question_id}'."
                        ),
                        "supportedLanguages":
                            supported_languages
                    }
                )

            # ---------------------------------------------
            # Get language-specific starter code
            # ---------------------------------------------

            starter_code_map = item.get(
                "starterCode",
                {}
            )

            function_signature_map = item.get(
                "functionSignature",
                {}
            )

            starter_code = starter_code_map.get(
                language
            )

            function_signature = (
                function_signature_map.get(
                    language
                )
            )

            if starter_code is None:

                return response(
                    500,
                    {
                        "success": False,
                        "error": (
                            f"Starter code for "
                            f"language '{language}' "
                            "is not configured."
                        )
                    }
                )

            # ---------------------------------------------
            # Return language-specific response
            #
            # IMPORTANT:
            # We do NOT return expected test outputs.
            # This prevents users from simply seeing
            # the answers through the API.
            # ---------------------------------------------

            result = {

                "success": True,

                "questionId":
                    item.get(
                        "questionId"
                    ),

                "title":
                    item.get(
                        "title"
                    ),

                "description":
                    item.get(
                        "description"
                    ),

                "difficulty":
                    item.get(
                        "difficulty"
                    ),

                "language":
                    language,

                "supportedLanguages":
                    supported_languages,

                "questionType":
                    item.get(
                        "questionType"
                    ),

                "starterCode":
                    starter_code,

                "functionSignature":
                    function_signature,

                "testCaseCount":
                    len(
                        item.get(
                            "testCases",
                            []
                        )
                    )
            }

            return response(
                200,
                result
            )

        # -------------------------------------------------
        # No language selected
        #
        # Return question metadata and all starter-code
        # templates, but not expected test outputs.
        # -------------------------------------------------

        result = {

            "success": True,

            "questionId":
                item.get(
                    "questionId"
                ),

            "title":
                item.get(
                    "title"
                ),

            "description":
                item.get(
                    "description"
                ),

            "difficulty":
                item.get(
                    "difficulty"
                ),

            "supportedLanguages":
                supported_languages,

            "questionType":
                item.get(
                    "questionType"
                ),

            "starterCode":
                item.get(
                    "starterCode",
                    {}
                ),

            "functionSignature":
                item.get(
                    "functionSignature",
                    {}
                ),

            "testCaseCount":
                len(
                    item.get(
                        "testCases",
                        []
                    )
                )
        }

        return response(
            200,
            result
        )

    except Exception as error:

        return response(
            500,
            {
                "success": False,
                "error": str(error)
            }
        )


# =========================================================
# Standard API response
# =========================================================

def response(
    status_code,
    body
):

    return {

        "statusCode":
            status_code,

        "headers": {

            "Content-Type":
                "application/json",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Headers":
                "Content-Type,Authorization",

            "Access-Control-Allow-Methods":
                "GET,POST,OPTIONS"
        },

        "body":
            json.dumps(body)
    }