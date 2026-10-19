import json
import os

import boto3


# =========================================================
# AWS CLIENT
# =========================================================

dynamodb = boto3.resource("dynamodb")


# =========================================================
# ENVIRONMENT VARIABLES
# =========================================================

QUESTION_TABLE_NAME = os.environ.get(
    "QUESTION_TABLE"
)


# =========================================================
# LAMBDA ENTRY POINT
# =========================================================

def lambda_handler(event, context):

    try:

        # -------------------------------------------------
        # Validate environment variable
        # -------------------------------------------------

        if not QUESTION_TABLE_NAME:

            return response(
                500,
                {
                    "success": False,
                    "error": (
                        "QUESTION_TABLE environment variable "
                        "is not configured."
                    )
                }
            )

        # -------------------------------------------------
        # Connect to DynamoDB
        # -------------------------------------------------

        table = dynamodb.Table(
            QUESTION_TABLE_NAME
        )

        # -------------------------------------------------
        # Scan questions table
        #
        # We only return information needed by the
        # Question Library.
        #
        # Test cases and starter code are NOT returned here.
        # They are retrieved later by GET /question.
        # -------------------------------------------------

        questions = []

        scan_kwargs = {
            "ProjectionExpression": (
                "questionId, "
                "#title, "
                "description, "
                "difficulty, "
                "languages"
            ),
            "ExpressionAttributeNames": {
                "#title": "title"
            }
        }

        while True:

            result = table.scan(
                **scan_kwargs
            )

            items = result.get(
                "Items",
                []
            )

            for item in items:

                questions.append(
                    {
                        "questionId": item.get(
                            "questionId"
                        ),
                        "title": item.get(
                            "title"
                        ),
                        "description": item.get(
                            "description"
                        ),
                        "difficulty": item.get(
                            "difficulty"
                        ),
                        "languages": item.get(
                            "languages",
                            []
                        )
                    }
                )

            # -------------------------------------------------
            # DynamoDB can paginate Scan results.
            #
            # This makes the endpoint work even when you
            # eventually have more questions.
            # -------------------------------------------------

            last_key = result.get(
                "LastEvaluatedKey"
            )

            if not last_key:

                break

            scan_kwargs[
                "ExclusiveStartKey"
            ] = last_key

        # -------------------------------------------------
        # Sort questions alphabetically by title
        # -------------------------------------------------

        questions.sort(
            key=lambda question: (
                question.get("title") or ""
            ).lower()
        )

        # -------------------------------------------------
        # Return question list
        # -------------------------------------------------

        return response(
            200,
            {
                "success": True,
                "totalQuestions": len(
                    questions
                ),
                "questions": questions
            }
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
# RESPONSE HELPER
# =========================================================

def response(
    status_code,
    body
):

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": (
                "Content-Type,Authorization"
            ),
            "Access-Control-Allow-Methods": (
                "GET,OPTIONS"
            )
        },
        "body": json.dumps(
            body
        )
    }