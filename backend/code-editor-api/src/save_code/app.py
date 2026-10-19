import json
import os
import uuid
from datetime import datetime, timezone

import boto3


# =========================================================
# DYNAMODB
# =========================================================

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ.get(
    "SAVED_CODE_TABLE"
)

if not TABLE_NAME:
    raise RuntimeError(
        "SAVED_CODE_TABLE environment variable "
        "is not configured."
    )

table = dynamodb.Table(
    TABLE_NAME
)


# =========================================================
# LAMBDA ENTRY POINT
# =========================================================

def lambda_handler(event, context):

    try:

        # -------------------------------------------------
        # Get authenticated Cognito user
        # -------------------------------------------------

        user_id = get_authenticated_user_id(event)

        if not user_id:

            return response(
                401,
                {
                    "success": False,
                    "error": (
                        "Authenticated Cognito user "
                        "could not be identified."
                    )
                }
            )

        user_id = str(user_id).strip()

        if not user_id:

            return response(
                401,
                {
                    "success": False,
                    "error": (
                        "Authenticated Cognito user ID "
                        "is empty."
                    )
                }
            )


        # -------------------------------------------------
        # Read request body
        # -------------------------------------------------

        body = get_request_body(event)


        # -------------------------------------------------
        # Get request information
        #
        # IMPORTANT:
        # userId is NOT read from the request body.
        # The user ID comes from Cognito.
        # -------------------------------------------------

        question_id = body.get(
            "questionId"
        )

        language = body.get(
            "language"
        )

        code = body.get(
            "code"
        )


        # =================================================
        # VALIDATION
        # =================================================

        # -------------------------------------------------
        # Question ID
        # -------------------------------------------------

        if not question_id:

            return response(
                400,
                {
                    "success": False,
                    "error": "questionId is required."
                }
            )

        question_id = str(
            question_id
        ).strip()

        if not question_id:

            return response(
                400,
                {
                    "success": False,
                    "error": "questionId cannot be empty."
                }
            )


        # -------------------------------------------------
        # Language
        # -------------------------------------------------

        if not language:

            return response(
                400,
                {
                    "success": False,
                    "error": "language is required."
                }
            )

        language = str(
            language
        ).lower().strip()


        # -------------------------------------------------
        # Validate supported language
        # -------------------------------------------------

        if language not in (
            "python",
            "java"
        ):

            return response(
                400,
                {
                    "success": False,
                    "error": (
                        "Only Python and Java "
                        "are currently supported."
                    )
                }
            )


        # -------------------------------------------------
        # Code
        # -------------------------------------------------

        if code is None:

            return response(
                400,
                {
                    "success": False,
                    "error": "code is required."
                }
            )


        if not isinstance(
            code,
            str
        ):

            return response(
                400,
                {
                    "success": False,
                    "error": "code must be a string."
                }
            )


        if not code.strip():

            return response(
                400,
                {
                    "success": False,
                    "error": "code cannot be empty."
                }
            )


        # =================================================
        # CREATE SAVE RECORD
        # =================================================

        save_id = str(
            uuid.uuid4()
        )

        saved_at = datetime.now(
            timezone.utc
        ).isoformat()


        item = {
            "saveId": save_id,

            # IMPORTANT:
            # This comes from Cognito, NOT the client.
            "userId": user_id,

            "questionId": question_id,

            "language": language,

            "code": code,

            "savedAt": saved_at
        }


        # =================================================
        # SAVE TO DYNAMODB
        # =================================================

        table.put_item(
            Item=item
        )


        # =================================================
        # SUCCESS RESPONSE
        # =================================================

        return response(
            200,
            {
                "success": True,

                "message":
                    "Code saved successfully.",

                "saveId":
                    save_id,

                "userId":
                    user_id,

                "questionId":
                    question_id,

                "language":
                    language,

                "savedAt":
                    saved_at
            }
        )


    # =====================================================
    # INVALID JSON
    # =====================================================

    except json.JSONDecodeError:

        return response(
            400,
            {
                "success": False,
                "error": (
                    "Request body must contain "
                    "valid JSON."
                )
            }
        )


    # =====================================================
    # GENERAL ERROR
    # =====================================================

    except Exception as error:

        print(
            "SaveCodeFunction error:",
            str(error)
        )

        return response(
            500,
            {
                "success": False,
                "error": "Internal server error."
            }
        )


# =========================================================
# GET AUTHENTICATED COGNITO USER
# =========================================================

def get_authenticated_user_id(event):

    try:

        request_context = event.get(
            "requestContext",
            {}
        )

        authorizer = request_context.get(
            "authorizer",
            {}
        )

        claims = authorizer.get(
            "claims",
            {}
        )

        # Cognito "sub" is the unique user identifier.
        user_id = claims.get(
            "sub"
        )

        return user_id

    except Exception as error:

        print(
            "Unable to read Cognito claims:",
            str(error)
        )

        return None


# =========================================================
# READ REQUEST BODY
# =========================================================

def get_request_body(event):

    body = event.get(
        "body"
    )


    # -----------------------------------------------------
    # API Gateway normally sends body as a string
    # -----------------------------------------------------

    if isinstance(
        body,
        str
    ):

        if not body.strip():

            return {}

        return json.loads(
            body
        )


    # -----------------------------------------------------
    # Useful for local testing
    # -----------------------------------------------------

    if isinstance(
        body,
        dict
    ):

        return body


    # -----------------------------------------------------
    # No body
    # -----------------------------------------------------

    return {}


# =========================================================
# STANDARD API RESPONSE
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
            json.dumps(
                body
            )
    }