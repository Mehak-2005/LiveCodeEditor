import json
import os

import boto3
from boto3.dynamodb.conditions import Key


# =========================================================
# DYNAMODB
# =========================================================

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ.get(
    "SAVED_CODE_TABLE"
)

INDEX_NAME = os.environ.get(
    "SAVED_CODE_INDEX"
)


if not TABLE_NAME:
    raise RuntimeError(
        "SAVED_CODE_TABLE environment variable "
        "is not configured."
    )


if not INDEX_NAME:
    raise RuntimeError(
        "SAVED_CODE_INDEX environment variable "
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

        user_id = get_authenticated_user_id(
            event
        )


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


        user_id = str(
            user_id
        ).strip()


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
        # Query only this authenticated user's saved code
        # -------------------------------------------------

        result = table.query(

            IndexName=INDEX_NAME,

            KeyConditionExpression=(
                Key("userId").eq(user_id)
            ),

            ScanIndexForward=False
        )


        items = result.get(
            "Items",
            []
        )


        # -------------------------------------------------
        # Return saved code
        # -------------------------------------------------

        return response(
            200,
            {
                "success": True,

                "userId": user_id,

                "count": len(items),

                "savedCode": items
            }
        )


    # =====================================================
    # GENERAL ERROR
    # =====================================================

    except Exception as error:

        print(
            "GetSavedCodeFunction error:",
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