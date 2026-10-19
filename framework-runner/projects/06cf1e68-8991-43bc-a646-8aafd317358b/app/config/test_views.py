
from django.test import TestCase
from django.urls import reverse


class HomePageTests(TestCase):

    def test_home_page_returns_success(self):
        response = self.client.get(reverse("home"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
           response.json()["message"],
           "Django live reload test successful!"
)

    def test_status_endpoint_is_healthy(self):
        response = self.client.get(reverse("status"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["status"],
            "Application is healthy"
        )
